<?php

namespace App\Console\Commands;

use App\Models\Chapter;
use App\Models\Course;
use App\Models\Resource;
use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CoursesSyncCommand extends Command
{
    protected $signature = 'courses:sync
        {--source=C:\\Users\\Benid\\OneDrive\\IPET\\2026-2027\\01_Cours : Dossier source OneDrive}
        {--teacher=teacher@ecolenet.be : Email du professeur propriétaire}
        {--class= : Ne traiter qu\'un dossier de classe (ex. 2eme)}
        {--structure-only : Créer classes, sections et cours sans importer les fichiers}
        {--prune : Signaler et retirer les ressources dont le fichier source a disparu}
        {--dry-run : Simulation sans écriture}';

    protected $description = 'Importe et synchronise les cours OneDrive → Bibliothèque EcoleNet (incrémental par hash MD5)';

    /**
     * Un profil par dossier de classe. 'library' dépose les cours dans la bibliothèque
     * sous le nom `[code | module] chapitre`, à assigner ensuite à la main. 'class'
     * crée la classe et ses sections, et y rattache directement les cours.
     */
    private const PROFILES = [
        '4TTR_INFO' => ['code' => '4TTR', 'layout' => 'ttr',   'mode' => 'library'],
        '5TTR_INFO' => ['code' => '5TTR', 'layout' => 'ttr',   'mode' => 'library'],
        '6TTR_INFO' => ['code' => '6TTR', 'layout' => 'ttr',   'mode' => 'library'],
        '2eme'      => ['code' => '2e',   'layout' => 'socle', 'mode' => 'class+library',
                        'class_name' => '2e année', 'year' => '2026-2027'],
    ];

    private const LAYOUTS = [
        'ttr'   => ['module' => '/^M\d/',                 'chapter' => '/^Chap\d|^Bilan$/'],
        'socle' => ['module' => '/^(Decouverte|Option)$/', 'chapter' => '/^[SU]\d+_/'],
    ];

    // subfolder name → [resource type, extensions to import, visible to students]
    private const FOLDER_MAP_TTR = [
        'A_Competences_PDF'           => ['competences',         ['pdf'],  true],
        'B_Syllabus_PDF'              => ['syllabus',            ['pdf'],  true],
        'B_Enonce_PDF'                => ['syllabus',            ['pdf'],  true],
        'C_Presentation'              => ['presentation',        ['pptx'], true],
        'C_Presentation_PDF'          => ['presentation',        ['pdf'],  true],
        'C_Solution_PDF'              => ['evaluation_solution', ['pdf'],  true],
        'D_Exercices'                 => ['exercise',            ['html'], true],
        'D_Exercices_PDF'             => ['exercise',            ['pdf'],  true],
        'D_Exercices_Solution'        => ['exercise_solution',   ['html'], true],
        'D_Exercices_Solution_PDF'    => ['exercise_solution',   ['pdf'],  true],
        'D_Grille_Evaluation'         => ['evaluation',          ['xlsx'], true],
        'D_Grille_Evaluation_PDF'     => ['evaluation',          ['pdf'],  true],
        'E_Revisions'                 => ['revision',            ['html'], true],
        'E_Revisions_PDF'             => ['revision',            ['pdf'],  true],
        'E_Revisions_Solution'        => ['revision_solution',   ['html'], true],
        'E_Revisions_Solution_PDF'    => ['revision_solution',   ['pdf'],  true],
        'F_Evaluations'               => ['evaluation',          ['html'], true],
        'F_Evaluations_PDF'           => ['evaluation',          ['pdf'],  true],
        'F_Evaluations_Solution'      => ['evaluation_solution', ['html'], true],
        'F_Evaluations_Solution_PDF'  => ['evaluation_solution', ['pdf'],  true],
    ];

    // Le déroulé prof est importé mais jamais montré aux élèves.
    private const FOLDER_MAP_SOCLE = [
        'A_Deroule_Prof'              => ['syllabus',     ['docx'],                 false],
        'A_Deroule_Prof_PDF'          => ['syllabus',     ['pdf'],                  false],
        'B_Presentation'              => ['presentation', ['pptx'],                 true],
        'B_Presentation_PDF'          => ['presentation', ['pdf'],                  true],
        'C_Fiche_Eleve'               => ['syllabus',     ['docx'],                 true],
        'C_Fiche_Eleve_PDF'           => ['syllabus',     ['pdf'],                  true],
        'D_Exercices'                 => ['exercise',     ['html'],                 true],
        'D_Atelier'                   => ['exercise',     ['html'],                 true],
        'D_Ressources'                => ['syllabus',     ['docx','pptx','xlsx'],   true],
        'D_Ressources_PDF'            => ['syllabus',     ['pdf'],                  true],
        'E_Competences'               => ['competences',  ['docx'],                 true],
        'E_Competences_PDF'           => ['competences',  ['pdf'],                  true],
    ];

    /** Les noms de dossiers perdent les accents : on les restitue ici. */
    private const LABELS = [
        'Decouverte'                    => 'Découverte',
        'S3_Mon_robot_reagit'           => 'S3 - Mon robot réagit',
        'U1_Jeux_codeorg'               => 'U1 - Jeux Code.org',
        'U3_La_machine_decodee'         => 'U3 - La machine décodée',
        'U4_Creation_numerique'         => 'U4 - Création numérique',
        'U6_Ma_premiere_page_web'       => 'U6 - Ma première page web',
    ];

    /**
     * Un élève ne voit que les ressources rangées dans un chapitre : sa vue ne charge
     * que `chapters.resources`. Les cours rattachés reçoivent donc ce chapitre unique,
     * du même nom que celui créé par `organizeRootResources()` et par l'attribution
     * depuis la bibliothèque.
     */
    private const DEFAULT_CHAPTER = 'Cours';

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
    private bool $structureOnly;
    private int $teacherId;
    private int $created = 0;
    private int $updated = 0;
    private int $skipped = 0;
    private int $coursesCreated = 0;

    public function handle(): int
    {
        $this->dryRun = (bool) $this->option('dry-run');
        $this->structureOnly = (bool) $this->option('structure-only');
        $source = rtrim((string) $this->option('source'), '\\/');
        $only = $this->option('class');

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
        if ($this->structureOnly) {
            $this->warn('Mode STRUCTURE-ONLY — classes, sections et cours seulement, aucun fichier importé');
        }
        $this->info("Source     : {$source}");
        $this->info("Professeur : {$teacher->email}");
        $this->newLine();

        foreach (new \DirectoryIterator($source) as $item) {
            if (!$item->isDir() || $item->isDot()) continue;
            $folder = $item->getFilename();
            if (!array_key_exists($folder, self::PROFILES)) continue;
            if ($only && $folder !== $only) continue;
            $this->processClass($item->getPathname(), $folder);
        }

        if ($this->option('prune')) {
            $this->pruneVanishedSources();
        }

        $this->newLine();
        if ($this->structureOnly) {
            $this->info("Terminé — Cours créés : {$this->coursesCreated}");
        } else {
            $this->info("Terminé — Créés : {$this->created} | Mis à jour : {$this->updated} | Inchangés : {$this->skipped}");
        }
        return 0;
    }

    /**
     * Un fichier supprimé ou renommé dans OneDrive laisse sa ressource en base : la
     * synchro ne la revoit jamais et le cours continue d'afficher un document que
     * l'enseignant croit avoir retiré. Un renommage crée en plus un doublon, la
     * nouvelle version arrivant sous un autre source_path.
     */
    private function pruneVanishedSources(): void
    {
        $this->newLine();
        $this->line('<fg=cyan>▶ Purge des ressources dont la source a disparu</>');

        $vanished = Resource::whereNotNull('source_path')->get()
            ->filter(fn (Resource $resource) => !is_file($resource->source_path));

        if ($vanished->isEmpty()) {
            $this->line('  aucune');
            return;
        }

        foreach ($vanished as $resource) {
            $this->line("  [-] {$resource->file_name}  <fg=gray>({$resource->title})</>");

            if ($this->dryRun) {
                continue;
            }

            // Le fichier copié n'est retiré que s'il n'est plus référencé ailleurs :
            // un cours rattaché et son jumeau de bibliothèque le partagent.
            $shared = Resource::where('file_path', $resource->file_path)
                ->where('id', '!=', $resource->id)
                ->exists();

            if (!$shared && $resource->file_path) {
                Storage::disk('local')->delete($resource->file_path);
            }

            $resource->delete();
        }

        $this->line('  <fg=yellow>' . $vanished->count() . ' ressource(s) ' . ($this->dryRun ? 'à retirer' : 'retirée(s)') . '</>');
    }

    // ── Class ─────────────────────────────────────────────────────────────────

    private function processClass(string $path, string $folder): void
    {
        $profile = self::PROFILES[$folder];
        $layout = self::LAYOUTS[$profile['layout']];
        $this->line("<fg=cyan>▶ {$profile['code']}</>");

        $class = $this->buildsClass($profile) ? $this->ensureClass($profile) : null;
        $order = 1;

        foreach ($this->sortedDirs($path, $layout['module']) as $moduleDir) {
            $this->processModule($moduleDir, $profile, $layout, $class, $order);
            $order++;
        }
    }

    /** Le profil alimente-t-il une vraie classe, avec ses sections ? */
    private function buildsClass(array $profile): bool
    {
        return str_contains($profile['mode'], 'class');
    }

    private function ensureClass(array $profile): ?SchoolClass
    {
        $slug = Str::slug($profile['class_name']);
        $class = SchoolClass::where('slug', $slug)->first();

        // En dry-run on se contente de retrouver l'existant : sans lui, les cours
        // déjà rattachés seraient introuvables et comptés comme des créations.
        if ($class || $this->dryRun) {
            return $class;
        }

        return SchoolClass::create([
            'slug'      => $slug,
            'name'      => $profile['class_name'],
            'year'      => $profile['year'] ?? null,
            'is_active' => true,
        ]);
    }

    private function ensureSection(?SchoolClass $class, string $label, string $code, int $order): ?Section
    {
        if (!$class) return null;

        $section = Section::where('class_id', $class->id)->where('name', $label)->first();

        if ($section || $this->dryRun) {
            return $section;
        }

        return Section::create([
            'class_id'  => $class->id,
            'name'      => $label,
            'slug'      => Str::slug($code . '-' . $label),
            'order'     => $order,
            'is_active' => true,
        ]);
    }

    // ── Module → section ──────────────────────────────────────────────────────

    private function processModule(string $path, array $profile, array $layout, ?SchoolClass $class, int $order): void
    {
        $folder = basename($path);
        $section = null;

        if ($this->buildsClass($profile)) {
            $label = self::LABELS[$folder] ?? str_replace('_', ' ', $folder);
            $this->line("  <fg=yellow>⊕ {$label}</>");

            $section = $this->ensureSection($class, $label, $profile['code'], $order);
            $moduleCode = $label;
        } else {
            $moduleCode = $this->formatModuleCode($folder);
            $this->line("  <fg=yellow>⊕ {$moduleCode}</>");
        }

        $chapOrder = 1;
        foreach ($this->sortedDirs($path, $layout['chapter']) as $chapDir) {
            $this->processChapter($chapDir, $profile, $moduleCode, $section, $chapOrder);
            $chapOrder++;
        }
    }

    // ── Chapter → course ──────────────────────────────────────────────────────

    private function processChapter(string $path, array $profile, string $moduleCode, ?Section $section, int $order): void
    {
        $folder = basename($path);
        $chapName = self::LABELS[$folder] ?? $this->formatChapter($folder);
        $this->line("    <fg=white>· {$chapName}</>");

        $mode = $profile['mode'];
        $targets = [];

        // Un chapitre peut alimenter les deux destinations à la fois : le cours rattaché
        // que suivent les élèves, et son jumeau en bibliothèque, réassignable à une autre classe.
        if ($mode === 'class' || $mode === 'class+library') {
            $attached = $this->ensureCourse($chapName, $section, true, $order);
            // Un élève ne voit que les ressources rangées dans un chapitre : la vue
            // élève ne charge que `chapters.resources`. Un cours rattaché doit donc
            // en avoir un, sinon son contenu lui est invisible.
            $targets[] = [$attached, $this->ensureDefaultChapter($attached)];
        }
        if ($mode === 'library' || $mode === 'class+library') {
            // Le jumeau de bibliothèque garde ses ressources à la racine : seul
            // l'enseignant le parcourt, et assignToSection() crée le chapitre au
            // moment de l'attribution.
            $targets[] = [$this->ensureCourse("[{$profile['code']} | {$moduleCode}] {$chapName}", null, false, 0), null];
        }

        if ($this->structureOnly) return;

        $map = $profile['layout'] === 'socle' ? self::FOLDER_MAP_SOCLE : self::FOLDER_MAP_TTR;

        foreach (new \DirectoryIterator($path) as $sub) {
            if (!$sub->isDir() || $sub->isDot()) continue;
            $key = $sub->getFilename();
            if (!array_key_exists($key, $map)) continue;
            [$type, $extensions, $visible] = $map[$key];
            foreach ($targets as [$course, $chapterId]) {
                $this->processResourceFolder($sub->getPathname(), $type, $extensions, $visible, $course, $chapterId);
            }
        }
    }

    /**
     * Retrouve le cours, ou le crée. En dry-run il est seulement recherché, jamais créé :
     * le retrouver permet de rapporter les ressources existantes comme mises à jour
     * plutôt que comme créations.
     */
    private function ensureCourse(string $name, ?Section $section, bool $attached, int $order): ?Course
    {
        // Recherche par nom exact : reste idempotent même si un cours de
        // bibliothèque a été assigné à une section entre deux synchros.
        $query = Course::where('teacher_id', $this->teacherId)->where('name', $name);
        if ($attached) {
            $query->where('section_id', $section?->id);
        }
        $course = $query->first();

        if ($course || $this->dryRun) {
            return $course;
        }

        $this->coursesCreated++;

        return Course::create([
            'name'        => $name,
            'slug'        => $this->uniqueLibrarySlug($name),
            'teacher_id'  => $this->teacherId,
            'section_id'  => $attached ? $section?->id : null,
            'is_archived' => !$attached,
            'is_active'   => true,
            'order'       => $attached ? $order : 0,
        ]);
    }

    // ── Resource folder ───────────────────────────────────────────────────────

    private function processResourceFolder(string $path, string $type, array $extensions, bool $visible, ?Course $course, ?int $chapterId = null): void
    {
        foreach ($extensions as $ext) {
            foreach (glob("{$path}/*.{$ext}") as $filePath) {
                $this->processFile($filePath, $type, $visible, $course, $chapterId);
            }
        }
    }

    /** Chapitre unique où ranger les ressources d'un cours rattaché. */
    private function ensureDefaultChapter(?Course $course): ?int
    {
        if (!$course || $this->dryRun) {
            return null;
        }

        return Chapter::firstOrCreate(
            ['course_id' => $course->id, 'title' => self::DEFAULT_CHAPTER],
            ['order' => 1]
        )->id;
    }

    // ── Individual file ───────────────────────────────────────────────────────

    private function processFile(string $filePath, string $type, bool $visible, ?Course $course, ?int $chapterId = null): void
    {
        $fileName = basename($filePath);
        $hash = md5_file($filePath);
        $fileType = $this->fileTypeFor(pathinfo($filePath, PATHINFO_EXTENSION));

        // Le même fichier source peut alimenter plusieurs cours (rattaché + bibliothèque),
        // donc l'identité d'une ressource, c'est le couple fichier + cours.
        $existing = $course
            ? Resource::where('source_path', $filePath)->where('course_id', $course->id)->first()
            : null;

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
        Storage::disk('local')->put($storagePath, file_get_contents($filePath));

        // Ce que la synchro possède : l'état du fichier, qu'elle réécrit à chaque passage.
        $data = [
            'file_path'   => $storagePath,
            'file_name'   => $fileName,
            'file_size'   => filesize($filePath),
            'file_type'   => $fileType,
            'source_path' => $filePath,
            'source_hash' => $hash,
        ];

        if ($existing) {
            // Ce qui appartient au professeur — titre affiché et visibilité — n'est pas
            // repris : ses choix doivent survivre à toute modification du fichier source.
            $existing->update($data);
            $this->updated++;
            $this->line("      [~] {$fileName}");
        } else {
            if (!$course) return;
            Resource::create(array_merge($data, [
                'course_id'  => $course->id,
                'chapter_id' => $chapterId,
                'type'       => $type,
                'order'      => self::TYPE_ORDER[$type] ?? 99,
                'title'      => $this->formatTitle($fileName, $type),
                'is_visible' => $visible,
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

    private function fileTypeFor(string $extension): string
    {
        return match (strtolower($extension)) {
            'pdf'         => 'pdf',
            'pptx'        => 'pptx',
            'docx'        => 'docx',
            'xlsx'        => 'xlsx',
            'html', 'htm' => 'html_interactive',
            default       => 'pdf',
        };
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
        if (preg_match('/^(Chap\d+|[SU]\d+)_(.+)$/', $folder, $m)) {
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
