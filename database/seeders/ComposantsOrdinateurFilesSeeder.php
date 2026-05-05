<?php

namespace Database\Seeders;

use App\Models\Chapter;
use App\Models\Course;
use App\Models\Exercise;
use App\Models\Resource;
use Illuminate\Database\Seeder;
use PhpOffice\PhpPresentation\IOFactory as PrsFactory;
use PhpOffice\PhpPresentation\PhpPresentation;
use PhpOffice\PhpPresentation\Style\Alignment;
use PhpOffice\PhpPresentation\Style\Color;
use PhpOffice\PhpWord\IOFactory as WordFactory;
use PhpOffice\PhpWord\PhpWord;

class ComposantsOrdinateurFilesSeeder extends Seeder
{
    private string $dir;
    private string $rel;
    private int    $courseId;

    public function run(): void
    {
        $course = Course::where('slug', 'composants-ordinateur')
            ->with(['chapters' => fn ($q) => $q
                ->with(['resources' => fn ($q2) => $q2
                    ->with(['qcmQuestions.options', 'exercise'])
                    ->orderBy('order')])
                ->orderBy('order')])
            ->first();

        $this->courseId = $course->id;
        $this->dir      = storage_path("app/public/resources/{$course->id}");
        $this->rel      = "resources/{$course->id}";

        if (!is_dir($this->dir)) mkdir($this->dir, 0775, true);

        foreach ($course->chapters as $chapter) {
            $this->handleChapter($chapter);
        }
    }

    // ── Per-chapter orchestration ──────────────────────────────────────────────

    private function handleChapter(Chapter $chapter): void
    {
        $n = $chapter->order;

        // 1. PPTX presentation (chapters 0-8)
        if ($n < 9) {
            $pptxFile = "presentation_ch" . ($n + 1) . ".pptx";
            $this->makePptx($pptxFile, $chapter->title, $this->slideData($n));
            $r = $chapter->resources->firstWhere('type', 'presentation');
            if ($r) $this->attachFile($r, $pptxFile, 'pptx');
        }

        // 2. Syllabus DOCX (chapter 0 only)
        if ($n === 0) {
            $sylFile = "syllabus.docx";
            $this->makeSyllabusDocx($sylFile);
            $r = $chapter->resources->firstWhere('type', 'syllabus');
            if ($r) $this->attachFile($r, $sylFile, 'docx');
        }

        // 3. Solution DOCX for every chapter
        $solFile      = "corrige_ch" . ($n + 1) . ".docx";
        $solutionType = ($n === 9) ? 'evaluation_solution' : 'exercise_solution';
        $this->makeSolutionDocx($solFile, $chapter);

        if (!$chapter->resources->firstWhere('type', $solutionType)) {
            $maxOrder = $chapter->resources->max('order') + 1;
            Resource::create([
                'course_id'  => $this->courseId,
                'chapter_id' => $chapter->id,
                'type'       => $solutionType,
                'file_type'  => 'docx',
                'title'      => 'Corrigé — ' . $chapter->title,
                'file_path'  => $this->rel . '/' . $solFile,
                'file_name'  => $solFile,
                'file_size'  => filesize($this->dir . '/' . $solFile),
                'is_visible' => true,
                'order'      => $maxOrder,
            ]);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PPTX generator
    // ══════════════════════════════════════════════════════════════════════════

    private function makePptx(string $filename, string $chapterTitle, array $slides): void
    {
        $prs   = new PhpPresentation();
        $first = true;

        foreach ($slides as $data) {
            $slide = $first ? $prs->getActiveSlide() : $prs->createSlide();
            $first = false;

            if ($data['type'] === 'title') {
                $this->pptxTitleSlide($slide, $data['title'], $data['subtitle'] ?? 'Les Composants de l\'Ordinateur');
            } else {
                $this->pptxContentSlide($slide, $data['title'], $data['bullets']);
            }
        }

        $writer = PrsFactory::createWriter($prs, 'PowerPoint2007');
        $writer->save($this->dir . '/' . $filename);
    }

    private function pptxTitleSlide($slide, string $title, string $subtitle): void
    {
        $shape = $slide->createRichTextShape();
        $shape->setHeight(140)->setWidth(900)->setOffsetX(30)->setOffsetY(200);
        $para  = $shape->getActiveParagraph();
        $para->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $run = $para->createTextRun($title);
        $run->getFont()->setBold(true)->setSize(30)->setColor(new Color('FF1565C0'));

        $sub  = $slide->createRichTextShape();
        $sub->setHeight(60)->setWidth(900)->setOffsetX(30)->setOffsetY(360);
        $subP = $sub->getActiveParagraph();
        $subP->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $subR = $subP->createTextRun($subtitle);
        $subR->getFont()->setSize(18)->setColor(new Color('FF546E7A'));
    }

    private function pptxContentSlide($slide, string $title, array $bullets): void
    {
        $titleShape = $slide->createRichTextShape();
        $titleShape->setHeight(58)->setWidth(900)->setOffsetX(30)->setOffsetY(18);
        $run = $titleShape->getActiveParagraph()->createTextRun($title);
        $run->getFont()->setBold(true)->setSize(22)->setColor(new Color('FF1565C0'));

        $body   = $slide->createRichTextShape();
        $body->setHeight(500)->setWidth(870)->setOffsetX(45)->setOffsetY(90);
        $isFirst = true;
        foreach ($bullets as $bullet) {
            $para    = $isFirst ? $body->getActiveParagraph() : $body->createParagraph();
            $isFirst = false;
            $para->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $r = $para->createTextRun('• ' . $bullet);
            $r->getFont()->setSize(15)->setColor(new Color('FF212121'));
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Syllabus DOCX
    // ══════════════════════════════════════════════════════════════════════════

    private function makeSyllabusDocx(string $filename): void
    {
        $word = new PhpWord();
        $word->addTitleStyle(1, ['bold' => true, 'size' => 22, 'color' => '1565C0'], ['spaceAfter' => 200]);
        $word->addTitleStyle(2, ['bold' => true, 'size' => 14, 'color' => '263238'], ['spaceBefore' => 240, 'spaceAfter' => 120]);

        $s = $word->addSection();
        $s->addTitle('SYLLABUS — Les Composants de l\'Ordinateur', 1);
        $s->addTextBreak();

        // 1. Informations générales
        $s->addTitle('1. Informations générales', 2);
        $t = $s->addTable(['borderSize' => 6, 'borderColor' => 'BBBBBB', 'cellMargin' => 80]);
        foreach ([
            ['Cours',      'Les Composants de l\'Ordinateur'],
            ['Matière',    'Informatique / Technologie informatique'],
            ['Niveau',     '3e technique de transition informatique'],
            ['Durée',      '10 chapitres + évaluation finale'],
            ['Enseignant', 'Prof. Dupont'],
        ] as [$k, $v]) {
            $t->addRow();
            $t->addCell(2800)->addText($k, ['bold' => true, 'size' => 11]);
            $t->addCell(6000)->addText($v, ['size' => 11]);
        }
        $s->addTextBreak();

        // 2. Description
        $s->addTitle('2. Description du cours', 2);
        $s->addText(
            'Ce cours propose une découverte complète des composants matériels d\'un ordinateur. ' .
            'Les élèves apprennent à identifier, nommer et comprendre le rôle de chaque composant, ' .
            'depuis le processeur jusqu\'aux périphériques, en passant par la mémoire, le stockage ' .
            'et les bus de communication. Les exercices variés (QCM, textes à trous, glisser-déposer, ' .
            'mise en ordre, tables de vérité) permettent une assimilation progressive et interactive.',
            ['size' => 11]
        );
        $s->addTextBreak();

        // 3. Objectifs
        $s->addTitle('3. Objectifs pédagogiques', 2);
        $s->addText('À la fin de ce cours, l\'élève sera capable de :', ['size' => 11]);
        foreach ([
            'Identifier et nommer les composants internes et externes d\'un ordinateur',
            'Décrire le rôle et le fonctionnement de chaque composant',
            'Distinguer les technologies de mémoire (RAM, ROM, cache) et de stockage (HDD, SSD, NVMe)',
            'Analyser des caractéristiques techniques : fréquence (GHz), capacité (Go), débit (Mo/s)',
            'Comparer les technologies : HDD vs SSD, CPU vs GPU, RAM vs ROM',
            'Expliquer le cycle Fetch-Decode-Execute d\'un processeur',
            'Interpréter une table de vérité pour les portes logiques AND, OR et NOT',
            'Classer des périphériques selon leur type (entrée, sortie, mixte)',
        ] as $obj) {
            $s->addListItem($obj, 0, ['size' => 11]);
        }
        $s->addTextBreak();

        // 4. Prérequis
        $s->addTitle('4. Prérequis', 2);
        foreach ([
            'Utilisation basique d\'un ordinateur (souris, clavier, navigateur web)',
            'Notions de base sur les fichiers et les dossiers',
            'Connaissance des unités de mesure souhaitée (bits, octets, GHz)',
        ] as $p) {
            $s->addListItem($p, 0, ['size' => 11]);
        }
        $s->addTextBreak();

        // 5. Programme
        $s->addTitle('5. Programme détaillé', 2);
        $pt = $s->addTable(['borderSize' => 6, 'borderColor' => 'BBBBBB', 'cellMargin' => 80]);
        $pt->addRow();
        foreach (['Chapitre', 'Titre', 'Contenu abordé'] as $h) {
            $pt->addCell(1800)->addText($h, ['bold' => true, 'size' => 10]);
        }
        foreach ([
            ['Ch. 1',  'Introduction — Architecture générale',    'Von Neumann, composants principaux, unités de mesure'],
            ['Ch. 2',  'L\'Unité Centrale (UC)',                  'Boîtier, alimentation (PSU), refroidissement, form factors'],
            ['Ch. 3',  'Le Processeur (CPU)',                     'Architecture, cycle FDE, cœurs, fréquence, cache'],
            ['Ch. 4',  'La Mémoire (RAM, ROM, Cache)',            'Types de mémoire, hiérarchie, DDR, dual channel'],
            ['Ch. 5',  'Le Stockage (HDD, SSD, NVMe)',           'Disque dur, SSD flash, NVMe PCIe, comparatif'],
            ['Ch. 6',  'La Carte Mère',                          'Connecteurs, chipset, BIOS/UEFI, form factors'],
            ['Ch. 7',  'La Carte Graphique (GPU)',               'Architecture GPU, CPU vs GPU, iGPU vs dédié, VRAM'],
            ['Ch. 8',  'Les Bus et l\'Architecture Interne',     'Bus données/adresses/contrôle, PCIe, SATA, USB, logique'],
            ['Ch. 9',  'Les Périphériques',                      'Classification, interfaces, drivers, Plug and Play'],
            ['Ch. 10', 'Révision Générale et Évaluation Finale', 'Révision tous chapitres, QCM 20q, évaluation finale'],
        ] as [$ch, $title, $content]) {
            $pt->addRow();
            $pt->addCell(1800)->addText($ch, ['size' => 10]);
            $pt->addCell(3200)->addText($title, ['size' => 10]);
            $pt->addCell(4800)->addText($content, ['size' => 10]);
        }
        $s->addTextBreak();

        // 6. Évaluation
        $s->addTitle('6. Modalités d\'évaluation', 2);
        $et = $s->addTable(['borderSize' => 6, 'borderColor' => 'BBBBBB', 'cellMargin' => 80]);
        $et->addRow();
        $et->addCell(7000)->addText('Type d\'évaluation', ['bold' => true, 'size' => 11]);
        $et->addCell(2500)->addText('Pondération', ['bold' => true, 'size' => 11]);
        foreach ([
            ['Exercices interactifs (QCM, textes à trous, glisser-déposer, ordering)', '40 %'],
            ['QCM de révision par chapitre',                                           '20 %'],
            ['Évaluation finale',                                                      '40 %'],
        ] as [$type, $pct]) {
            $et->addRow();
            $et->addCell(7000)->addText($type, ['size' => 11]);
            $et->addCell(2500)->addText($pct, ['bold' => true, 'size' => 11]);
        }
        $s->addTextBreak();

        // 7. Ressources
        $s->addTitle('7. Ressources recommandées', 2);
        foreach ([
            'Cours en ligne sur EcoleNet (présentations, vidéos, exercices interactifs)',
            'Documentation constructeurs : Intel ARK, AMD, NVIDIA',
            'Hardware.fr — Tests et analyses de composants en français',
            'Tom\'s Hardware France — Guide d\'achat et actualités matériel',
        ] as $r) {
            $s->addListItem($r, 0, ['size' => 11]);
        }

        WordFactory::createWriter($word, 'Word2007')->save($this->dir . '/' . $filename);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Solution DOCX
    // ══════════════════════════════════════════════════════════════════════════

    private function makeSolutionDocx(string $filename, Chapter $chapter): void
    {
        $word = new PhpWord();
        $word->addTitleStyle(1, ['bold' => true, 'size' => 18, 'color' => '1565C0'], ['spaceAfter' => 200]);
        $word->addTitleStyle(2, ['bold' => true, 'size' => 13, 'color' => '263238'], ['spaceBefore' => 280, 'spaceAfter' => 100]);

        $s = $word->addSection();
        $s->addTitle('CORRIGÉ — ' . $chapter->title, 1);
        $s->addText('Les Composants de l\'Ordinateur', ['size' => 11, 'italic' => true, 'color' => '546E7A']);
        $s->addTextBreak();

        foreach ($chapter->resources as $resource) {
            if (!in_array($resource->type, ['exercise', 'revision', 'evaluation'])) continue;

            $s->addTitle($resource->title, 2);

            if ($resource->file_type === 'qcm') {
                $this->writeQcmSolution($s, $resource);
            } elseif ($resource->exercise) {
                $this->writeExerciseSolution($s, $resource->exercise);
            }
            $s->addTextBreak();
        }

        WordFactory::createWriter($word, 'Word2007')->save($this->dir . '/' . $filename);
    }

    private function writeQcmSolution($section, Resource $resource): void
    {
        foreach ($resource->qcmQuestions as $i => $question) {
            $section->addText(($i + 1) . '. ' . $question->question, ['bold' => true, 'size' => 11]);
            foreach ($question->options as $option) {
                $ok = $option->is_correct;
                $section->addText(
                    ($ok ? '  ✓ ' : '     ') . $option->label,
                    ['size' => 11, 'bold' => $ok, 'color' => $ok ? '2E7D32' : '757575']
                );
            }
            if ($question->explanation) {
                $section->addText('→ ' . $question->explanation, ['size' => 10, 'italic' => true, 'color' => '1565C0']);
            }
            $section->addTextBreak(1);
        }
    }

    private function writeExerciseSolution($section, Exercise $exercise): void
    {
        $content = $exercise->content;

        switch ($exercise->type) {
            case 'fill_blanks':
                $section->addText('Texte complété (réponses entre crochets) :', ['bold' => true, 'size' => 11]);
                $filled = preg_replace('/\[\[([^\]]+)\]\]/', '[→ $1]', $content['template'] ?? '');
                $section->addText($filled, ['size' => 11]);
                break;

            case 'drag_drop':
                $section->addText('Associations correctes :', ['bold' => true, 'size' => 11]);
                $t = $section->addTable(['borderSize' => 6, 'borderColor' => 'BBBBBB', 'cellMargin' => 80]);
                $t->addRow();
                $t->addCell(4500)->addText('Élément', ['bold' => true, 'size' => 10]);
                $t->addCell(4500)->addText('Catégorie / Association correcte', ['bold' => true, 'size' => 10]);
                foreach ($content['pairs'] ?? [] as $pair) {
                    $t->addRow();
                    $t->addCell(4500)->addText($pair['left'],  ['size' => 10]);
                    $t->addCell(4500)->addText($pair['right'], ['size' => 10, 'bold' => true, 'color' => '2E7D32']);
                }
                break;

            case 'ordering':
                $section->addText('Ordre correct :', ['bold' => true, 'size' => 11]);
                foreach ($content['items'] ?? [] as $i => $item) {
                    $section->addListItem(($i + 1) . '. ' . $item, 0, ['size' => 11, 'color' => '2E7D32']);
                }
                break;

            case 'truth_table':
                $section->addText('Table de vérité complète :', ['bold' => true, 'size' => 11]);
                $vars    = $content['variables']     ?? [];
                $outputs = $content['output_labels'] ?? [];
                $rows    = $content['rows']          ?? [];
                $t = $section->addTable(['borderSize' => 6, 'borderColor' => 'BBBBBB', 'cellMargin' => 80]);
                $t->addRow();
                foreach ($vars    as $v) $t->addCell(1500)->addText($v, ['bold' => true, 'size' => 10]);
                foreach ($outputs as $o) $t->addCell(1500)->addText($o, ['bold' => true, 'size' => 10, 'color' => '1565C0']);
                foreach ($rows as $row) {
                    $t->addRow();
                    foreach ($row['inputs']  as $v) $t->addCell(1500)->addText((string)$v, ['size' => 10]);
                    foreach ($row['outputs'] as $v) $t->addCell(1500)->addText((string)$v, ['size' => 10, 'bold' => true, 'color' => '2E7D32']);
                }
                break;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Slide data per chapter (0-based index)
    // ══════════════════════════════════════════════════════════════════════════

    private function slideData(int $n): array
    {
        return match ($n) {
            0 => $this->slidesIntroduction(),
            1 => $this->slidesUC(),
            2 => $this->slidesCPU(),
            3 => $this->slidesMemoire(),
            4 => $this->slidesStockage(),
            5 => $this->slidesCarteMere(),
            6 => $this->slidesGPU(),
            7 => $this->slidesBus(),
            8 => $this->slidesPeripheriques(),
            default => [],
        };
    }

    private function c(string $title, array $bullets): array
    {
        return ['type' => 'content', 'title' => $title, 'bullets' => $bullets];
    }

    private function t(string $title, string $subtitle = 'Les Composants de l\'Ordinateur'): array
    {
        return ['type' => 'title', 'title' => $title, 'subtitle' => $subtitle];
    }

    // ── Chapter slide sets ────────────────────────────────────────────────────

    private function slidesIntroduction(): array { return [
        $this->t('Introduction — Architecture Générale d\'un Ordinateur'),
        $this->c('Qu\'est-ce qu\'un ordinateur ?', [
            'Machine électronique programmable capable de traiter automatiquement des informations',
            'Suit des instructions codées dans des programmes (software)',
            'Composée de matériel (hardware) et de logiciels (software)',
            'Exemples : PC de bureau, laptop, smartphone, tablette, serveur',
            'Modèle de base : Entrée de données → Traitement → Sortie de résultats',
        ]),
        $this->c('Le modèle de Von Neumann (1945)', [
            'Architecture fondamentale adoptée par tous les ordinateurs modernes',
            '4 composants clés : Mémoire centrale, Unité de traitement (CPU), Entrées, Sorties',
            'Communication entre composants via un bus partagé',
            'Concept clé : le programme est stocké en mémoire, comme les données',
            'Proposé par John von Neumann, mathématicien hungaro-américain',
        ]),
        $this->c('Les composants principaux d\'un PC', [
            'Processeur (CPU) : cerveau — lit et exécute les instructions',
            'Mémoire vive (RAM) : espace de travail temporaire et volatile',
            'Stockage (HDD/SSD) : mémoire de masse permanente et non volatile',
            'Carte mère : circuit principal qui interconnecte tous les composants',
            'Alimentation (PSU) : convertit le courant alternatif en courant continu',
            'Carte graphique (GPU) : calcul et rendu des images à l\'écran',
        ]),
        $this->c('Le flux d\'information', [
            'Modèle IPO : Entrée (Input) → Traitement (Processing) → Sortie (Output)',
            'Exemple : frappe au clavier → CPU traite → affichage à l\'écran',
            'Les données transitent entre composants via les bus',
            'Le CPU orchestre et coordonne tous les échanges',
            'Un programme = suite d\'instructions guidant le traitement',
        ]),
        $this->c('Unités de mesure essentielles', [
            'Bit (b) : unité binaire de base, vaut 0 ou 1',
            'Octet (o) = 8 bits | Ko = 1 024 o | Mo = 1 024 Ko | Go = 1 024 Mo',
            'Fréquence : Hz (cycles/s) → kHz → MHz → GHz (milliards de cycles/s)',
            'Débit : Mo/s ou Go/s — vitesse de transfert de données',
            'Latence : délai de réponse — ms (HDD), µs (SSD), ns (RAM)',
        ]),
    ]; }

    private function slidesUC(): array { return [
        $this->t('L\'Unité Centrale (UC / Boîtier)'),
        $this->c('Le boîtier : rôle et types', [
            'Contient et protège tous les composants internes du PC',
            'Tour verticale : Full Tower (grand), Mid Tower (standard), Mini Tower (compact)',
            'Format bureau (desktop) : horizontal, plus encombrant mais stable',
            'Matériaux : acier, aluminium, plastique ABS, parfois verre trempé',
            'Ventilation : prises d\'air à l\'avant/bas, sorties à l\'arrière/haut',
        ]),
        $this->c('Ce que contient le boîtier', [
            'Carte mère (motherboard) : circuit principal, base de tout',
            'Processeur (CPU) + dissipateur thermique (ventirad ou AIO)',
            'Barrettes de mémoire vive (RAM) — slots DIMM',
            'Disques de stockage : HDD 3.5" / SSD 2.5" / NVMe M.2',
            'Carte graphique dédiée (GPU) — connectée au slot PCIe x16',
            'Alimentation électrique (PSU) — reliée à tous les composants',
        ]),
        $this->c('L\'alimentation (PSU)', [
            'Convertit 230V AC (secteur) en 3.3V / 5V / 12V DC (composants)',
            'Puissance en Watts : 500W (office) → 850W (gaming) → 1200W+ (haut de gamme)',
            'Certification 80 PLUS : rendement ≥ 80% — Bronze, Silver, Gold, Platinum, Titanium',
            'Modulaire : câbles détachables → meilleure gestion des câbles',
            'Calcul recommandé : somme des consommations + 20% de marge de sécurité',
        ]),
        $this->c('Le refroidissement', [
            'Air cooling (ventirad) : ventilateur + dissipateur — simple et économique',
            'AIO (All-In-One) : radiateur eau + pompe intégrés — silencieux et efficace',
            'Watercooling custom : circuit avec réservoir, pompe et radiateur séparés',
            'Pâte thermique : interface conductrice entre CPU et dissipateur (obligatoire)',
            'Thermal throttling : réduction auto de fréquence si température critique atteinte',
        ]),
        $this->c('Facteurs de forme (Form Factors)', [
            'ATX : 305 × 244 mm — 7 slots d\'extension, standard pour bureautique et gaming',
            'Micro-ATX : 244 × 244 mm — 4 slots, bon compromis encombrement/fonctionnalité',
            'Mini-ITX : 170 × 170 mm — 1 slot PCIe, pour builds ultra-compacts',
            'E-ATX : 305 × 330 mm — workstations et serveurs, nombreux slots',
            'Important : le boîtier, la carte mère et la PSU doivent être compatibles',
        ]),
    ]; }

    private function slidesCPU(): array { return [
        $this->t('Le Processeur (CPU)'),
        $this->c('Définition et rôle', [
            'CPU = Central Processing Unit (Unité Centrale de Traitement)',
            'Cerveau de l\'ordinateur : exécute toutes les instructions des programmes',
            'Traite des milliards d\'opérations arithmétiques et logiques par seconde',
            'Coordonne CPU, RAM, stockage, GPU et périphériques',
            'Principaux fabricants : Intel (Core i3/i5/i7/i9) et AMD (Ryzen 3/5/7/9)',
        ]),
        $this->c('Architecture interne du CPU', [
            'Unité de contrôle (CU) : lit, interprète et ordonne les instructions',
            'ALU (Arithmetic Logic Unit) : effectue calculs mathématiques et comparaisons logiques',
            'Registres : mémoire interne ultra-rapide du CPU (quelques dizaines d\'octets)',
            'Cache L1 / L2 / L3 : tampons entre CPU et RAM (quelques Ko à plusieurs Mo)',
            'Interface bus : connecte le CPU à la RAM et aux autres composants',
        ]),
        $this->c('Cycle Fetch-Decode-Execute', [
            'FETCH : lire l\'instruction suivante depuis la mémoire RAM',
            'DECODE : décoder l\'instruction — quel opcode ? quels opérandes ?',
            'EXECUTE : effectuer l\'opération par l\'ALU ou l\'unité de contrôle',
            'WRITEBACK : écrire le résultat dans un registre ou en mémoire',
            'Ce cycle se répète des milliards de fois par seconde (pipelining, superscalaire)',
        ]),
        $this->c('Cœurs, threads et Hyper-Threading', [
            'Cœur (core) : unité d\'exécution indépendante et complète',
            'Thread : flux d\'exécution logique (un programme peut en avoir plusieurs)',
            'Hyper-Threading (Intel) / SMT (AMD) : 2 threads logiques par cœur physique',
            'Exemple : Intel Core i9-13900K — 24 cœurs physiques, 32 threads logiques',
            'Plus de cœurs → meilleure gestion du multitâche et des logiciels parallèles',
        ]),
        $this->c('Fréquence d\'horloge et IPC', [
            'Fréquence (GHz) : nombre de cycles d\'horloge par seconde',
            'Base Clock : fréquence normale | Boost Clock : fréquence maximale auto',
            'Exemple : AMD Ryzen 9 7950X — Base 4.5 GHz, Boost 5.7 GHz',
            'IPC (Instructions Per Clock) : nombre d\'instructions exécutées par cycle',
            'Performance ≈ Fréquence × IPC × Cœurs (non linéaire)',
        ]),
        $this->c('La mémoire cache', [
            'Rôle : éviter les accès lents à la RAM en gardant les données fréquentes',
            'Cache L1 : 32-64 Ko/cœur, intégré dans le cœur, latence < 1 ns',
            'Cache L2 : 256 Ko à 1 Mo/cœur, latence ~3-5 ns',
            'Cache L3 : 8 à 96 Mo partagé entre tous les cœurs, latence ~10-15 ns',
            'Cache miss → accès RAM (50-100 ns) = 50× à 100× plus lent qu\'un hit L1',
        ]),
    ]; }

    private function slidesMemoire(): array { return [
        $this->t('La Mémoire (RAM, ROM, Cache)'),
        $this->c('Les types de mémoire', [
            'RAM (Random Access Memory) : volatile, rapide — stocke les programmes actifs',
            'ROM (Read Only Memory) : non volatile — stocke le firmware (BIOS/UEFI)',
            'Cache CPU : ultra-rapide (< 1 ns), de quelques Ko à quelques Mo',
            'Flash NAND : non volatile — SSD, clés USB, cartes SD',
            'VRAM (Video RAM) : mémoire dédiée de la carte graphique (GDDR6/GDDR6X)',
        ]),
        $this->c('La RAM en détail', [
            'Volatile : contenu perdu à l\'extinction (≠ stockage permanent)',
            'Capacités courantes : 8 Go (office), 16-32 Go (gaming), 64 Go+ (pro)',
            'DDR4 : 2133-3600 MHz — standard 2015-2022',
            'DDR5 : 4800-8000 MHz — standard des plateformes modernes (2022+)',
            'DDR = Double Data Rate : transfert au front montant ET descendant du cycle',
            'Tension : 1.35V (DDR4) / 1.1V (DDR5) — moins de chaleur générée',
        ]),
        $this->c('La ROM et la mémoire flash', [
            'ROM classique : gravée en usine, non modifiable (firmware de base)',
            'EEPROM / Flash EEPROM : ROM effaçable électroniquement (ex : mises à jour BIOS)',
            'Contient le BIOS/UEFI sur la carte mère — démarre le PC',
            'Flash NAND : base technologique des SSD, clés USB, cartes mémoire',
            'Non volatile : conserve les données indéfiniment sans alimentation',
        ]),
        $this->c('La hiérarchie mémoire', [
            'Règle : plus une mémoire est rapide → plus elle est petite et chère',
            'Registres CPU : < 1 ns — quelques Ko — dans le processeur',
            'Cache L1/L2/L3 : 1-15 ns — 32 Ko à 96 Mo — dans/près du processeur',
            'RAM DDR5 : 15-30 ns — 8 à 256 Go — barrettes sur la carte mère',
            'SSD NVMe : 20-100 µs — 256 Go à 4 To — stockage interne',
            'HDD mécanique : 5-15 ms — 500 Go à 20 To — stockage de masse',
        ]),
        $this->c('Dual Channel et mémoire virtuelle', [
            'Dual Channel : 2 barrettes identiques dans les slots A2/B2 → bande passante × 2',
            'Quad Channel : plateformes HEDT et serveurs (Intel X, AMD EPYC)',
            'XMP (Intel) / EXPO (AMD) : profil OC mémoire activé dans le BIOS',
            'Mémoire virtuelle : extension de la RAM sur le disque (pagefile.sys / swap)',
            'Mémoire virtuelle ~1 000× plus lente que RAM physique — à éviter si possible',
        ]),
    ]; }

    private function slidesStockage(): array { return [
        $this->t('Le Stockage (HDD, SSD, NVMe)'),
        $this->c('Vue d\'ensemble du stockage', [
            'Stockage = mémoire de masse permanente et non volatile',
            'Conserve l\'OS, les programmes et les données utilisateur',
            'Technologies : HDD (magnétique), SSD SATA (flash), SSD NVMe (flash + PCIe)',
            'Critères : capacité (Go/To), vitesse (Mo/s), latence, fiabilité, prix/Go',
            'Usage conseillé : NVMe pour l\'OS, HDD pour archivage de masse',
        ]),
        $this->c('Le Disque Dur (HDD)', [
            'Plateaux magnétiques en rotation : 5 400 RPM ou 7 200 RPM',
            'Tête de lecture/écriture électromagnétique sur bras mobile',
            'Latence mécanique : 5-15 ms (positionnement de tête)',
            'Débit séquentiel : 80-200 Mo/s (limité par la vitesse de rotation)',
            'Capacités jusqu\'à 20 To+ — meilleur prix par Go (~15-25 €/To)',
            'Fragile aux chocs et vibrations — pièces mécaniques en mouvement',
        ]),
        $this->c('Le SSD (Solid State Drive)', [
            'Mémoire NAND flash : cellules sans pièce mécanique mobile',
            'Cellules : SLC (1 bit) > MLC (2) > TLC (3) > QLC (4 bits/cellule)',
            'Plus de bits/cellule = moins cher mais moins durable (cycles P/E)',
            'Aucune pièce mécanique : résistant aux chocs, silencieux',
            'Interface SATA III : max ~550 Mo/s | Latence < 0.1 ms',
            '3× à 5× plus cher par Go que le HDD, mais prix en baisse constante',
        ]),
        $this->c('SSD NVMe PCIe — Le standard actuel', [
            'NVMe = Non-Volatile Memory Express : protocole optimisé pour flash',
            'Connecté directement au bus PCIe (contourne le contrôleur SATA lent)',
            'Format M.2 : 22 × 80 mm — s\'insère directement sur la carte mère',
            'NVMe Gen 3 : ~3 500 Mo/s | Gen 4 : ~7 000 Mo/s | Gen 5 : ~14 000 Mo/s',
            'Latence ~20-50 µs — 5× plus réactif qu\'un SSD SATA',
            'Standard recommandé pour le disque système sur tout PC en 2025',
        ]),
        $this->c('Comparatif HDD / SSD / NVMe', [
            'HDD : grande capacité, prix bas, lent (150 Mo/s), fragile',
            'SSD SATA : rapide (500 Mo/s), compact, fiable — bon choix intermédiaire',
            'SSD NVMe Gen 4 : ultra-rapide (5-7 Go/s) — indispensable pour poste de travail',
            'Conseil pratique : NVMe pour Windows + apps, HDD pour données et archivage',
            'Règle de sauvegarde 3-2-1 : 3 copies sur 2 supports dont 1 hors site',
        ]),
    ]; }

    private function slidesCarteMere(): array { return [
        $this->t('La Carte Mère (Motherboard)'),
        $this->c('Rôle et composition', [
            'Circuit imprimé principal (PCB) sur lequel s\'interconnectent tous les composants',
            'Point central : CPU, RAM, GPU, stockage et périphériques communiquent via elle',
            'Contient : chipset, BIOS/UEFI, régulateurs de tension (VRM), connecteurs',
            'Détermine la compatibilité : socket CPU, génération RAM, nombre de slots',
            'Marques populaires : ASUS ROG/Prime, MSI MAG/MEG, Gigabyte AORUS, ASRock',
        ]),
        $this->c('Les connecteurs principaux', [
            'Socket CPU : LGA1700 (Intel 12e-13e gen) / AM5 (AMD Ryzen 7000+)',
            'Slots DIMM × 2 ou × 4 : accueillent les barrettes RAM DDR4 ou DDR5',
            'Slot PCIe x16 : pour la carte graphique (GPU)',
            'Ports SATA × 4-6 : HDD 3.5" et SSD 2.5"',
            'Slots M.2 × 1-3 : SSD NVMe format 22 × 80 mm',
            'Connecteur ATX 24 broches + EPS 8 broches : alimentation carte mère + CPU',
        ]),
        $this->c('Le chipset', [
            'Ensemble de circuits gérant les communications CPU ↔ périphériques',
            'Sur plateformes modernes : une seule puce (hub) sous le socket CPU',
            'Détermine : nombre de ports USB/SATA, lanes PCIe, support overclocking',
            'Intel : Z (overclocking) > B (mid-range) > H (basique) — ex : Z790, B760',
            'AMD : X (OC) > B (mid) > A (basique) — ex : X670E, B650, A620',
            'Chipset haut de gamme = plus de connectivité et de fonctionnalités',
        ]),
        $this->c('Le BIOS / UEFI', [
            'BIOS : Basic Input/Output System — firmware des premiers PC (16 bits, 2 To max)',
            'UEFI : Unified Extensible Firmware Interface — successeur moderne (64 bits, interface graphique)',
            'POST (Power-On Self-Test) : vérifie CPU, RAM, stockage au démarrage',
            'Lance le bootloader (Windows Boot Manager, GRUB) qui charge l\'OS',
            'Réglages possibles : ordre de boot, profil XMP/EXPO, fan curves, tensions CPU/RAM',
        ]),
        $this->c('Choisir sa carte mère', [
            'Étape 1 : choisir le socket (Intel LGA vs AMD AM — non interchangeables)',
            'Étape 2 : facteur de forme (ATX, mATX, ITX) selon le boîtier',
            'Étape 3 : génération RAM supportée — DDR4 OU DDR5 (pas les deux)',
            'Étape 4 : nombre de slots M.2, ports SATA, USB selon les besoins',
            'Budget : 80€ (entrée de gamme) → 200€ (mid) → 500€+ (enthusiast)',
        ]),
    ]; }

    private function slidesGPU(): array { return [
        $this->t('La Carte Graphique (GPU)'),
        $this->c('Rôle et définition', [
            'GPU = Graphics Processing Unit — processeur spécialisé dans le calcul graphique',
            'Calcule la couleur de chaque pixel (rasterisation) et gère le rendu 3D',
            'Applications : jeux vidéo, création 3D, montage vidéo, deep learning',
            'Connectée au slot PCIe x16 sur la carte mère',
            'Fabricants : NVIDIA (GeForce RTX), AMD (Radeon RX), Intel (Arc)',
        ]),
        $this->c('Architecture du GPU', [
            'Des milliers de petits cœurs spécialisés (CUDA cores NVIDIA / Stream Processors AMD)',
            'NVIDIA RTX 4090 : 16 384 CUDA cores cadencés à 2.52 GHz',
            'VRAM GDDR6X : 24 Go de mémoire vidéo dédiée — textures et framebuffer',
            'RT Cores : calcul de ray tracing (lumière physiquement réaliste)',
            'Tensor Cores : accélération IA pour DLSS (super-résolution intelligente)',
        ]),
        $this->c('CPU vs GPU : complémentaires', [
            'CPU : 8-24 cœurs puissants, optimisé pour tâches séquentielles et logique complexe',
            'GPU : milliers de petits cœurs, optimisé pour traitement massivement parallèle',
            'CPU gère : OS, logiciels métier, IA de jeu, calculs complexes et ramifiés',
            'GPU gère : rendu 3D, shaders, millions de pixels simultanés, calcul matriciel',
            'Ils travaillent ensemble : CPU envoie les tâches, GPU les exécute en masse',
        ]),
        $this->c('GPU intégré (iGPU) vs GPU dédié', [
            'iGPU : intégré dans le processeur (Intel UHD, AMD Radeon Graphics)',
            'Partage la RAM principale — pas de VRAM dédiée — performances limitées',
            'Adapté pour : bureautique, web, vidéo Full HD, jeux 2D légers',
            'GPU dédié : carte PCIe avec sa propre VRAM GDDR6 (8 à 24 Go)',
            'Indispensable pour : jeux 3D AAA, Blender/3ds Max, montage 4K, IA',
        ]),
        $this->c('Applications du GPU en 2025', [
            'Gaming : rendu temps réel 1080p / 1440p / 4K à 60-240 fps',
            'Ray Tracing : ombres et reflets physiquement réalistes (RTX ON)',
            'DLSS / FSR / XeSS : upscaling par IA pour perf sans perte de qualité',
            'Deep Learning : training de modèles d\'IA (NVIDIA A100, H100)',
            'Transcodage vidéo : encodage H.265/AV1 matériel ultra-rapide (NVENC)',
        ]),
    ]; }

    private function slidesBus(): array { return [
        $this->t('Les Bus et l\'Architecture Interne'),
        $this->c('Définition et caractéristiques', [
            'Bus = ensemble de lignes de communication reliant les composants',
            'Transporte des données, des adresses et des signaux de contrôle',
            'Caractéristiques clés : largeur en bits et fréquence en Hz',
            'Bande passante (Mo/s) = Largeur (bits) × Fréquence (Hz) / 8',
            'Exemple : DDR5-6000 64 bits → bande passante ≈ 48 000 Mo/s (48 Go/s)',
        ]),
        $this->c('Les trois types de bus système', [
            'Bus de données (Data Bus) : transporte les données entre CPU, RAM, périphériques',
            'Bus d\'adresses (Address Bus) : indique l\'emplacement mémoire à lire ou écrire',
            'Bus de contrôle (Control Bus) : signaux de commande (lecture, écriture, interruptions)',
            'Topologie moderne : point à point (PCIe) plus rapide que bus partagé ancien',
            'Largeur 64 bits > 32 bits : plus de données transférées en un seul cycle',
        ]),
        $this->c('Les interfaces modernes (2025)', [
            'PCIe 5.0 × 16 : 128 Go/s bidirectionnel — GPU et NVMe haut de gamme',
            'PCIe 4.0 × 4 : 8 Go/s — SSD NVMe Gen 4',
            'SATA III : 600 Mo/s — HDD mécaniques et SSD SATA',
            'USB 3.2 Gen2 × 2 : 20 Gbit/s — disques externes haute vitesse',
            'Thunderbolt 4 / USB4 : 40 Gbit/s — docks et stockage externe pro',
            'DDR5 Dual Channel : 80-100 Go/s — interface CPU vers RAM',
        ]),
        $this->c('PCIe en détail', [
            'PCI Express = interface série point à point (≠ ancien bus parallèle partagé)',
            'Lanes : × 1 / × 4 / × 8 / × 16 — bande passante proportionnelle',
            'PCIe 4.0 : 2 Go/s par lane → × 16 = 32 Go/s (par sens)',
            'PCIe 5.0 : 4 Go/s par lane → × 16 = 64 Go/s (par sens)',
            'Rétrocompatible : une carte PCIe 3.0 fonctionne dans un slot PCIe 5.0',
        ]),
        $this->c('Logique binaire et portes logiques', [
            'Tout traitement informatique repose sur la logique binaire (0 et 1)',
            'Porte AND : sortie = 1 uniquement si A = 1 ET B = 1',
            'Porte OR  : sortie = 1 si A = 1 OU B = 1 (ou les deux)',
            'Porte NOT : inverse l\'entrée — NOT(0) = 1 et NOT(1) = 0',
            'L\'ALU du CPU est construite à partir de millions de ces portes élémentaires',
        ]),
    ]; }

    private function slidesPeripheriques(): array { return [
        $this->t('Les Périphériques'),
        $this->c('Classification des périphériques', [
            'Périphériques d\'ENTRÉE : envoient des données vers l\'ordinateur',
            '  → Clavier, souris, microphone, webcam, scanner, manette de jeu',
            'Périphériques de SORTIE : reçoivent et affichent des données de l\'ordinateur',
            '  → Écran, imprimante, haut-parleurs, vidéoprojecteur',
            'Périphériques MIXTES (entrée ET sortie) : bidirectionnels',
            '  → Écran tactile, disque externe USB, casque avec micro intégré',
        ]),
        $this->c('Les interfaces de connexion filaires', [
            'USB 2.0 : 480 Mbit/s — clavier, souris, clés USB basiques',
            'USB 3.2 Gen1 : 5 Gbit/s | Gen2 : 10 Gbit/s | Gen2×2 : 20 Gbit/s',
            'USB-C : connecteur réversible — données + vidéo + charge jusqu\'à 240W',
            'HDMI 2.1 : audio + vidéo numérique — jusqu\'à 4K@120Hz / 8K@60Hz',
            'DisplayPort 2.1 : jusqu\'à 8K@165Hz, profils HDR avancés',
            'Jack 3.5mm : audio analogique stéréo (casque, enceintes)',
        ]),
        $this->c('Les interfaces sans fil', [
            'Bluetooth 5.3 : ~2 Mbit/s, portée ~10m, très faible consommation',
            '  → Souris, clavier, casque, manette, smartwatch, smartphone',
            'Wi-Fi 6 (802.11ax) : débit > 9 Gbit/s théorique, très faible latence',
            'Wi-Fi 6E : ajoute la bande 6 GHz — moins d\'interférences',
            'Infrarouge (IR) : télécommandes — courte portée, ligne directe obligatoire',
        ]),
        $this->c('Les pilotes (drivers)', [
            'Logiciel faisant l\'interface entre le système d\'exploitation et le matériel',
            'Traduit les commandes génériques de l\'OS en instructions spécifiques au périphérique',
            'Spécifique à l\'OS (Windows 10/11, Linux, macOS) et à sa version',
            'Mises à jour recommandées : corrections de bugs, sécurité, nouvelles fonctions',
            'Plug and Play (PnP) : détection automatique + installation du driver générique',
            'Gestionnaire de périphériques Windows : voir, activer, mettre à jour les drivers',
        ]),
        $this->c('Évolution historique des interfaces', [
            'Port série RS-232 / port parallèle (années 1970-80) : obsolètes',
            'PS/2 (connecteur DIN rond) : clavier et souris — remplacé par USB en 2000s',
            'USB 1.0 (1996) → popularisé avec Windows 98 (1998) — "universel" enfin !',
            'USB 3.0 (2008) : 10× plus rapide — disques externes utilisables confortablement',
            'USB-C / Thunderbolt 4 (2021) : un seul câble pour tout — données, vidéo, charge',
        ]),
    ]; }

    // ── DB helper ─────────────────────────────────────────────────────────────

    private function attachFile(Resource $resource, string $filename, string $fileType): void
    {
        $resource->update([
            'file_path'    => $this->rel . '/' . $filename,
            'file_name'    => $filename,
            'file_size'    => filesize($this->dir . '/' . $filename),
            'file_type'    => $fileType,
            'external_url' => null,
        ]);
    }
}
