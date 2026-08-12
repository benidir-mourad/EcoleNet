<?php

namespace App\Console\Commands;

use App\Models\SchoolClass;
use Illuminate\Console\Command;

class CoursesMovToLibraryCommand extends Command
{
    protected $signature = 'courses:move-to-library';
    protected $description = 'Déplace les cours importés (4TTR/5TTR/6TTR) vers la bibliothèque avec noms préfixés';

    public function handle(): int
    {
        $importedClasses = ['4TTR - Informatique', '5TTR - Informatique', '6TTR - Informatique'];

        $classes = SchoolClass::whereIn('name', $importedClasses)
            ->with('sections.courses')
            ->get();

        if ($classes->isEmpty()) {
            $this->warn('Aucune classe importée trouvée.');
            return 0;
        }

        $moved = 0;

        foreach ($classes as $class) {
            $classCode = explode(' - ', $class->name)[0]; // "4TTR"

            foreach ($class->sections as $section) {
                // "M1 - HTML" → "M1-HTML"
                $moduleCode = str_replace([' - ', ' '], ['-', ''], $section->name);

                foreach ($section->courses as $course) {
                    $newName = "[{$classCode} | {$moduleCode}] {$course->name}";
                    $course->update([
                        'name'        => $newName,
                        'is_archived' => true,
                        'section_id'  => null,
                    ]);
                    $this->line("[+] {$newName}");
                    $moved++;
                }

                $section->delete();
            }

            $class->delete();
        }

        $this->newLine();
        $this->info("{$moved} cours déplacés vers la bibliothèque.");
        $this->info(count($importedClasses) . " classes et leurs sections supprimées.");
        return 0;
    }
}
