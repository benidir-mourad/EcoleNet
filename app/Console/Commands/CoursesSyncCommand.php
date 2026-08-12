<?php

namespace App\Console\Commands;

use App\Models\Course;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CoursesSyncCommand extends Command
{
    protected $signature = 'courses:sync
        {--source=C:\\Users\\Benid\\OneDrive\\IPET\\2026-2027\\01_Cours : Dossier source OneDrive}
        {--teacher=teacher@ecolenet.be : Email du professeur propriétaire}
        {--dry-run : Simulation sans écriture}';

    protected $description = 'Importe et synchronise les cours OneDrive → Bibliothèque EcoleNet (incrémental par hash MD5)';

    private const CLASS_NAMES = [
        '4TTR_INFO' => '4TTR',
        '5TTR_INFO' => '5TTR',
        '6TTR_INFO' => '6TTR',
    ];

    // subfolder name → [resource type, files to import: pdf|pptx|html|xlsx]
    private const FOLDER_MAP = [
        'A_Competences_PDF'           => ['competences',         'pdf'],
        'B_Syllabus_PDF'              => ['syllabus',            'pdf'],
        'B_Enonce_PDF'                => ['syllabus',            'pdf'],
        'C_Presentation'              => ['presentation',        'pptx'],
        'C_Presentation_PDF'          => ['presentation',        'pdf'],
        'C_Solution_PDF'              => ['evaluation_solution', 'pdf'],
        'D_Exercices'                 => ['exercise',            'html'],
        'D_Exercices_PDF'             => ['exercise',            'pdf'],
        'D_Exercices_Solution'        => ['exercise_solution',   'html'],
        'D_Exercices_Solution_PDF'    => ['exercise_solution',   'pdf'],
        'D_Grille_Evaluation'         => ['evaluation',          'xlsx'],
        'D_Grille_Evaluation_PDF'     => ['evaluation',          'pdf'],
        'E_Revisions'                 => ['revision',            'html'],
        'E_Revisions_PDF'             => ['revision',            'pdf'],
        'E_Revisions_Solution'        => ['revision_solution',   'html'],
        'E_Revisions_Solution_PDF'    => ['revision_solution',   'pdf'],
        'F_Evaluations'               => ['evaluation',          'html'],
        'F_Evaluations_PDF'           => ['evaluation',          'pdf'],
        'F_Evaluations_Solution'      => ['evaluation_solution', 'html'],
        'F_Evaluations_Solution_PDF'  => ['evaluation_solution', 'pdf'],
    ];

    private const TYPE_ORDER = [
        'competences'         => 10,
        'presentation'        => 20,
        'syllabus'            => 30,
        'exercise'            => 40,
        'exercise_solution'   => 50,
        'revision'            => 60,
        'revision_solution'   => 70,
        'evaluation'          => 80,
        'evaluation_solution' => 90,
    ];

    private bool $dryRun;
    private int $teacherId;
    private int $created = 0;
    private int $updated = 0;
    private int $skipped = 0;

    public function handle(): int
    {
        $this->dryRun = (bool) $this->option('dry-run');
        $source = rtrim((string) $this->option('source'), '\\/');

        if (!is_dir($source)) {
            $this->error("Dossier introuvable : {$source}");
            return 1;
        }

        $teacher = User::where('email', $this->option('teacher'))->first()
            ?? User::where('role', 'teacher')->first();

        if (!$teacher) {
            $this->error("Aucun professeur trouvé. Précisez --teacher=email@exemple.com");
            return 1;
        }

        $this->teacherId = $teacher->id;

        if ($this->dryRun) {
            $this->warn('Mode DRY-RUN — aucune écriture en base ni sur disque');
        }
        $this->info("Source     : {$source}");
        $this->info("Professeur : {$teacher->email}");
        $this->newLine();

        foreach (new \DirectoryIterator($source) as $item) {
            if (!$item->isDir() || $item->isDot()) continue;
            if (!array_key_exists($item->getFilename(), self::CLASS_NAMES)) continue;
            $this->processClass($item->getPathname(), $item->getFilename());
        }

        $this->newLine();
        $this->info("Terminé — Créés : {$this->created} | Mis à jour : {$this->updated} | Inchangés : {$this->skipped}");
        return 0;
    }

    // ── Class ─────────────────────────────────────────────────────────────────

    private function processClass(string $path, string $folder): void
    {
        $classCode = self::CLASS_NAMES[$folder];
        $this->line("<fg=cyan>▶ {$classCode}</>");

        foreach ($this->sortedDirs($path, '/^M\d/') as $moduleDir) {
            $this->processModule($moduleDir, $classCode);
        }
    }

    // ── Module ────────────────────────────────────────────────────────────────

    private function processModule(string $path, string $classCode): void
    {
        $moduleCode = $this->formatModuleCode(basename($path));
        $this->line("  <fg=yellow>⊕ {$moduleCode}</>");

        foreach ($this->sortedDirs($path, '/^Chap\d|^Bilan$/') as $chapDir) {
            $this->processChapter($chapDir, $classCode, $moduleCode);
        }
    }

    // ── Chapter → library course ──────────────────────────────────────────────

    private function processChapter(string $path, string $classCode, string $moduleCode): void
    {
        $chapName = $this->formatChapter(basename($path));
        $fullName = "[{$classCode} | {$moduleCode}] {$chapName}";
        $this->line("    <fg=white>· {$chapName}</>");

        $course = null;
        if (!$this->dryRun) {
            // Find by exact name — idempotent even after reassignment
            $course = Course::where('teacher_id', $this->teacherId)
                ->where('name', $fullName)
                ->first();

            if (!$course) {
                $course = Course::create([
                    'name'        => $fullName,
                    'slug'        => $this->uniqueLibrarySlug($fullName),
                    'teacher_id'  => $this->teacherId,
                    'section_id'  => null,
                    'is_archived' => true,
                    'is_active'   => true,
                    'order'       => 0,
                ]);
            }
        }

        foreach (new \DirectoryIterator($path) as $sub) {
            if (!$sub->isDir() || $sub->isDot()) continue;
            $key = $sub->getFilename();
            if (!array_key_exists($key, self::FOLDER_MAP)) continue;
            [$type, $mode] = self::FOLDER_MAP[$key];
            $this->processResourceFolder($sub->getPathname(), $type, $mode, $course);
        }
    }

    // ── Resource folder ───────────────────────────────────────────────────────

    private function processResourceFolder(string $path, string $type, string $mode, ?Course $course): void
    {
        $ext = match ($mode) {
            'pdf'  => 'pdf',
            'pptx' => 'pptx',
            'html' => 'html',
            'xlsx' => 'xlsx',
            default => null,
        };
        if (!$ext) return;

        foreach (glob("{$path}/*.{$ext}") as $filePath) {
            $this->processFile($filePath, $type, $mode, $course);
        }
    }

    // ── Individual file ───────────────────────────────────────────────────────

    private function processFile(string $filePath, string $type, string $mode, ?Course $course): void
    {
        $fileName = basename($filePath);
        $hash = md5_file($filePath);
        $fileType = match ($mode) {
            'pdf'  => 'pdf',
            'pptx' => 'pptx',
            'xlsx' => 'xlsx',
            'html' => 'html_interactive',
            default => 'pdf',
        };

        $existing = Resource::where('source_path', $filePath)->first();

        if ($existing && $existing->source_hash === $hash) {
            $this->skipped++;
            return;
        }

        if ($this->dryRun) {
            $verb = $existing ? 'UPDATE' : 'CREATE';
            $this->line("      [{$verb}] {$fileName} → {$type} ({$fileType})");
            $existing ? $this->updated++ : $this->created++;
            return;
        }

        $storagePath = $this->buildStoragePath($filePath, $type, $fileName);
        Storage::disk('public')->put($storagePath, file_get_contents($filePath));

        $data = [
            'file_path'   => $storagePath,
            'file_name'   => $fileName,
            'file_size'   => filesize($filePath),
            'file_type'   => $fileType,
            'title'       => $this->formatTitle($fileName, $type),
            'source_path' => $filePath,
            'source_hash' => $hash,
            'is_visible'  => true,
        ];

        if ($existing) {
            $existing->update($data);
            $this->updated++;
            $this->line("      [~] {$fileName}");
        } else {
            if (!$course) return;
            Resource::create(array_merge($data, [
                'course_id' => $course->id,
                'type'      => $type,
                'order'     => self::TYPE_ORDER[$type] ?? 99,
            ]));
            $this->created++;
            $this->line("      [+] {$fileName}");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildStoragePath(string $filePath, string $type, string $fileName): string
    {
        $rel = str_replace('\\', '/', $filePath);
        if (preg_match('|/01_Cours/(.+)/[^/]+$|', $rel, $m)) {
            $parts = explode('/', $m[1]);
            $class   = $parts[0] ?? 'unknown';
            $module  = $parts[1] ?? 'unknown';
            $chapter = $parts[2] ?? 'unknown';
            return "courses/{$class}/{$module}/{$chapter}/{$type}/{$fileName}";
        }
        return "courses/import/{$type}/{$fileName}";
    }

    private function formatModuleCode(string $folder): string
    {
        // M1_HTML → M1-HTML, M4_Systeme_et_logiciels → M4-Systemeetlogiciels
        // Words concatenated without separator to match existing library names
        if (preg_match('/^(M\d+)_(.+)$/', $folder, $m)) {
            return $m[1] . '-' . str_replace('_', '', $m[2]);
        }
        return str_replace('_', '', $folder);
    }

    private function formatChapter(string $folder): string
    {
        if ($folder === 'Bilan') return 'Bilan';
        if (preg_match('/^(Chap\d+)_(.+)$/', $folder, $m)) {
            return $m[1] . ' - ' . str_replace('_', ' ', $m[2]);
        }
        return str_replace('_', ' ', $folder);
    }

    private function formatTitle(string $fileName, string $type): string
    {
        $base = pathinfo($fileName, PATHINFO_FILENAME);
        $clean = preg_replace('/^Chap\d+_?/', '', $base);
        if (empty($clean)) {
            return ucfirst(str_replace('_', ' ', $type));
        }
        return str_replace('_', ' ', $clean);
    }

    private function uniqueLibrarySlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 2;
        // section_id is NULL for library courses → MySQL allows duplicate slugs on NULL,
        // but we still keep them unique for cleanliness
        while (Course::whereNull('section_id')->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }
        return $slug;
    }

    /** Returns sorted list of subdirectory paths matching $pattern */
    private function sortedDirs(string $path, string $pattern): array
    {
        $dirs = [];
        foreach (new \DirectoryIterator($path) as $item) {
            if (!$item->isDir() || $item->isDot()) continue;
            if (preg_match($pattern, $item->getFilename())) {
                $dirs[] = $item->getPathname();
            }
        }
        sort($dirs);
        return $dirs;
    }
}
