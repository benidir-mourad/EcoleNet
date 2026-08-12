<?php

namespace App\Console\Commands;

use App\Models\Chapter;
use App\Models\Course;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LibrarySync extends Command
{
    protected $signature = 'library:sync
        {dir : Chemin vers le dossier contenant les cours (ex: C:\\Users\\...\\01_Cours)}
        {--teacher=teacher@ecolenet.be : Email de l\'enseignant propriétaire des cours}
        {--dry-run : Affiche ce qui serait fait sans modifier la base de données}';

    protected $description = 'Synchronise les cours depuis une arborescence de dossiers vers la bibliothèque EcoleNet';

    // Ordre d'affichage des ressources par type
    private const TYPE_ORDER = [
        'competences'         => 10,
        'syllabus'            => 20,
        'presentation'        => 30,
        'exercise'            => 40,
        'exercise_solution'   => 50,
        'revision'            => 60,
        'revision_solution'   => 70,
        'evaluation'          => 80,
        'evaluation_solution' => 90,
    ];

    private const RESOURCE_TITLES = [
        'competences'         => 'Compétences',
        'syllabus'            => 'Syllabus',
        'presentation'        => 'Présentation',
        'exercise'            => 'Exercices',
        'exercise_solution'   => 'Solution des exercices',
        'revision'            => 'Révisions',
        'revision_solution'   => 'Solution des révisions',
        'evaluation'          => 'Évaluation',
        'evaluation_solution' => "Correction de l'évaluation",
    ];

    public function handle(): int
    {
        $dir    = rtrim(str_replace('\\', '/', $this->argument('dir')), '/');
        $email  = $this->option('teacher');
        $dryRun = $this->option('dry-run');

        if (! is_dir($dir)) {
            $this->error("Dossier introuvable : $dir");
            return 1;
        }

        $teacher = User::where('email', $email)->first();
        if (! $teacher) {
            $this->error("Enseignant introuvable : $email");
            return 1;
        }

        if ($dryRun) {
            $this->warn('[DRY RUN] Aucune modification ne sera effectuée.');
        }

        $stats = ['courses' => 0, 'chapters' => 0, 'created' => 0, 'updated' => 0, 'skipped' => 0];

        foreach ($this->listDirs($dir) as $classDir) {
            $class = basename($classDir);
            if (str_starts_with($class, '_') || str_starts_with($class, '.')) continue;

            $this->info("\nClasse : $class");

            foreach ($this->listDirs($classDir) as $moduleDir) {
                $this->syncModule($moduleDir, $class, $teacher->id, $dryRun, $stats);
            }
        }

        $this->newLine();
        $this->info('Synchronisation terminée.');
        $this->table(
            ['Cours', 'Chapitres', 'Ressources créées', 'Mises à jour', 'Inchangées'],
            [[$stats['courses'], $stats['chapters'], $stats['created'], $stats['updated'], $stats['skipped']]]
        );

        return 0;
    }

    private function syncModule(string $moduleDir, string $class, int $teacherId, bool $dryRun, array &$stats): void
    {
        $folderName  = basename($moduleDir);
        $courseName  = $this->extractModuleName($folderName);
        $slug        = Str::slug($class . '-' . $folderName);
        $description = $class . ' — ' . str_replace('_', ' ', $folderName);

        $this->line("  Cours : $courseName  (slug: $slug)");

        if (! $dryRun) {
            $course = Course::updateOrCreate(
                ['slug' => $slug],
                [
                    'teacher_id'  => $teacherId,
                    'section_id'  => null,
                    'name'        => $courseName,
                    'description' => $description,
                    'is_archived' => true,
                    'is_active'   => true,
                    'order'       => 0,
                ]
            );
        } else {
            $course = (object) ['id' => 0, 'slug' => $slug, 'name' => $courseName];
        }

        $stats['courses']++;

        $chapterDirs = $this->listDirs($moduleDir);
        usort($chapterDirs, fn($a, $b) => $this->chapterSortKey($a) <=> $this->chapterSortKey($b));

        foreach ($chapterDirs as $order => $chapterDir) {
            $this->syncChapter($chapterDir, $course, $order + 1, $dryRun, $stats);
        }
    }

    private function syncChapter(string $chapterDir, object $course, int $order, bool $dryRun, array &$stats): void
    {
        $folderName = basename($chapterDir);
        $isBilan    = str_starts_with($folderName, 'Bilan');
        $title      = $this->extractChapterTitle($folderName);

        $this->line("    Chapitre : $title");

        if (! $dryRun) {
            $chapter = Chapter::firstOrCreate(
                ['course_id' => $course->id, 'title' => $title],
                ['order' => $order]
            );
        } else {
            $chapter = (object) ['id' => 0, 'title' => $title];
        }

        $stats['chapters']++;

        // Les fichiers sont dans des sous-dossiers (A_Competences_PDF/, D_Exercices/, etc.)
        foreach ($this->listDirs($chapterDir) as $subDir) {
            $subName = basename($subDir);
            [$type, $allowedExts] = $this->classifySubdir($subName, $isBilan);
            if ($type === null) continue;

            foreach ($this->listFiles($subDir) as $filePath) {
                $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
                if (! in_array($ext, $allowedExts)) continue;

                $fileType = ($ext === 'html') ? 'html_embed' : 'pdf';
                $this->syncFile($filePath, $course, $chapter, $type, $fileType, $dryRun, $stats);
            }
        }
    }

    private function syncFile(string $filePath, object $course, object $chapter, string $type, string $fileType, bool $dryRun, array &$stats): void
    {
        $fileName = basename($filePath);
        $title    = $this->buildTitle($type, $fileType);
        $fileSize = filesize($filePath);
        $order    = (self::TYPE_ORDER[$type] ?? 99) + ($fileType === 'html_embed' ? 5 : 0);

        $this->line("      [$type/$fileType] $title  ($fileName)");

        if ($dryRun) return;

        $existing = Resource::where('chapter_id', $chapter->id)
            ->where('file_name', $fileName)
            ->first();

        if ($existing) {
            if ($existing->file_size === $fileSize) {
                $stats['skipped']++;
                return;
            }
            if ($existing->file_path) {
                Storage::disk('public')->delete($existing->file_path);
            }
            $storagePath = $this->copyToStorage($filePath, $course->id, $fileName);
            $existing->update([
                'file_path' => $storagePath,
                'file_size' => $fileSize,
                'type'      => $type,
                'file_type' => $fileType,
                'title'     => $title,
            ]);
            $stats['updated']++;
            return;
        }

        $storagePath = $this->copyToStorage($filePath, $course->id, $fileName);
        Resource::create([
            'course_id'  => $course->id,
            'chapter_id' => $chapter->id,
            'type'       => $type,
            'file_type'  => $fileType,
            'title'      => $title,
            'file_path'  => $storagePath,
            'file_name'  => $fileName,
            'file_size'  => $fileSize,
            'is_visible' => true,
            'order'      => $order,
        ]);
        $stats['created']++;
    }

    /**
     * Détermine le type de ressource et les extensions autorisées
     * à partir du nom d'un sous-dossier de chapitre.
     *
     * Règle : les sous-dossiers *_PDF ne contiennent que des PDFs,
     * les autres contiennent les sources (docx) + les exercices HTML.
     */
    private function classifySubdir(string $subName, bool $isBilan): array
    {
        $lower  = strtolower($subName);
        $prefix = strtoupper($subName[0] ?? '');
        $isPdf      = str_ends_with($lower, '_pdf');
        $isSolution = str_contains($lower, 'solution');

        $allowedExts = $isPdf ? ['pdf'] : ['html'];

        if ($isBilan) {
            $type = match ($prefix) {
                'A' => 'competences',
                'B' => 'evaluation',
                'C' => 'evaluation_solution',
                'D' => 'syllabus',
                default => null,
            };
            return [$type, $allowedExts];
        }

        if ($isSolution) {
            $type = match ($prefix) {
                'D' => 'exercise_solution',
                'E' => 'revision_solution',
                'F' => 'evaluation_solution',
                default => null,
            };
        } else {
            $type = match ($prefix) {
                'A' => 'competences',
                'B' => 'syllabus',
                'C' => 'presentation',
                'D' => 'exercise',
                'E' => 'revision',
                'F' => 'evaluation',
                default => null,
            };
        }

        return [$type, $allowedExts];
    }

    private function buildTitle(string $type, string $fileType): string
    {
        $base = self::RESOURCE_TITLES[$type] ?? $type;
        return $fileType === 'html_embed' ? $base . ' (interactif)' : $base;
    }

    private function extractModuleName(string $folder): string
    {
        if (preg_match('/^M\d+_(.+)$/', $folder, $m)) {
            return str_replace('_', ' ', $m[1]);
        }
        return str_replace('_', ' ', $folder);
    }

    private function extractChapterTitle(string $folder): string
    {
        if ($folder === 'Bilan') return 'Bilan';

        if (preg_match('/^Chap(\d+)_(.+)$/', $folder, $m)) {
            return 'Chap ' . $m[1] . ' — ' . str_replace('_', ' ', $m[2]);
        }
        if (preg_match('/^Projet_(.+)$/', $folder, $m)) {
            return 'Projet — ' . str_replace('_', ' ', $m[1]);
        }
        if (preg_match('/^Chap(\d+)$/', $folder, $m)) {
            return 'Chap ' . $m[1];
        }
        return str_replace('_', ' ', $folder);
    }

    private function chapterSortKey(string $dir): string
    {
        $name = basename($dir);
        if (preg_match('/^Chap(\d+)/', $name, $m)) {
            return '0_' . str_pad($m[1], 4, '0', STR_PAD_LEFT);
        }
        if (str_starts_with($name, 'Projet')) return '1_' . $name;
        if (str_starts_with($name, 'Bilan'))  return '2_' . $name;
        return '3_' . $name;
    }

    private function copyToStorage(string $sourcePath, int $courseId, string $fileName): string
    {
        $dest   = 'resources/' . $courseId . '/' . $fileName;
        $handle = fopen($sourcePath, 'r');
        Storage::disk('public')->put($dest, $handle);
        fclose($handle);
        return $dest;
    }

    private function listDirs(string $dir): array
    {
        $items = scandir($dir);
        if ($items === false) return [];
        return array_values(array_filter(
            array_map(fn($n) => "$dir/$n", array_diff($items, ['.', '..'])),
            'is_dir'
        ));
    }

    private function listFiles(string $dir): array
    {
        $items = scandir($dir);
        if ($items === false) return [];
        return array_values(array_filter(
            array_map(fn($n) => "$dir/$n", array_diff($items, ['.', '..'])),
            'is_file'
        ));
    }
}
