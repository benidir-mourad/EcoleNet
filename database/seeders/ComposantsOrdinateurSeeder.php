<?php

namespace Database\Seeders;

use App\Models\Chapter;
use App\Models\Course;
use App\Models\Exercise;
use App\Models\QcmOption;
use App\Models\QcmQuestion;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ComposantsOrdinateurSeeder extends Seeder
{
    private int $teacherId;

    public function run(): void
    {
        $this->teacherId = User::where('role', 'teacher')->first()->id;

        $course = Course::create([
            'section_id'  => null,
            'teacher_id'  => $this->teacherId,
            'name'        => 'Les Composants de l\'Ordinateur',
            'slug'        => 'composants-ordinateur',
            'description' => 'Découverte complète des composants matériels d\'un ordinateur : unité centrale, processeur, mémoire, stockage, carte mère, carte graphique, bus et périphériques.',
            'order'       => 0,
            'is_active'   => true,
            'is_archived' => true,
        ]);

        $this->chapter1($course);
        $this->chapter2($course);
        $this->chapter3($course);
        $this->chapter4($course);
        $this->chapter5($course);
        $this->chapter6($course);
        $this->chapter7($course);
        $this->chapter8($course);
        $this->chapter9($course);
        $this->chapter10($course);
    }

    // ── Chapter 1 : Introduction ──────────────────────────────────────────────

    private function chapter1(Course $course): void
    {
        $ch = $this->makeChapter($course, 'Introduction — Architecture générale d\'un ordinateur', 0);

        $this->makeResource($ch, $course, [
            'type' => 'syllabus', 'file_type' => 'link',
            'title' => 'Syllabus du cours — Composants de l\'ordinateur',
            'external_url' => null, 'order' => 0,
        ]);

        $this->makeResource($ch, $course, [
            'type' => 'presentation', 'file_type' => 'link',
            'title' => 'Vidéo — Qu\'est-ce qu\'un ordinateur ?',
            'external_url' => null, 'order' => 1,
        ]);

        $r = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'qcm',
            'title' => 'QCM — Vue d\'ensemble de l\'architecture', 'order' => 2,
        ]);
        $this->qcmIntroduction($r);

        $r2 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'ordering',
            'title' => 'Exercice — Remettre en ordre le démarrage d\'un PC', 'order' => 3,
        ]);
        $this->exOrdering($r2, 'Remets les étapes du démarrage d\'un ordinateur dans le bon ordre.', [
            'Le BIOS/UEFI s\'exécute et fait le POST (Power-On Self-Test)',
            'Le chargeur de démarrage (bootloader) est lu depuis le disque',
            'Le système d\'exploitation se charge en mémoire RAM',
            'L\'utilisateur voit l\'écran de connexion',
            'L\'utilisateur lance ses applications',
        ]);

        $r3 = $this->makeResource($ch, $course, [
            'type' => 'revision', 'file_type' => 'qcm',
            'title' => 'Révision — Architecture générale', 'order' => 4,
        ]);
        $this->qcmRevisionGenerale($r3);
    }

    // ── Chapter 2 : Unité Centrale ────────────────────────────────────────────

    private function chapter2(Course $course): void
    {
        $ch = $this->makeChapter($course, 'L\'Unité Centrale (UC / Boîtier)', 1);

        $this->makeResource($ch, $course, [
            'type' => 'presentation', 'file_type' => 'link',
            'title' => 'Vidéo — L\'intérieur d\'un boîtier PC',
            'external_url' => null, 'order' => 0,
        ]);

        $r = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'qcm',
            'title' => 'QCM — L\'Unité Centrale', 'order' => 1,
        ]);
        $this->qcmUniteCentrale($r);

        $r2 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'fill_blanks',
            'title' => 'Compléter — Rôle et composition du boîtier', 'order' => 2,
        ]);
        $this->exFillBlanks($r2,
            'Le boîtier d\'un ordinateur, aussi appelé [[unité centrale]], contient tous les composants [[internes]] de la machine. ' .
            'Il est relié aux [[périphériques]] externes par des câbles ou des connecteurs. ' .
            'L\'alimentation électrique (PSU) convertit le courant [[alternatif]] en courant [[continu]] utilisable par les composants.',
            false
        );

        $r3 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'drag_drop',
            'title' => 'Drag & Drop — Composants internes vs périphériques', 'order' => 3,
        ]);
        $this->exDragDrop($r3, 'Associe chaque composant à sa catégorie.', [
            ['left' => 'Carte mère',          'right' => 'Composant interne'],
            ['left' => 'Clavier',             'right' => 'Périphérique externe'],
            ['left' => 'Processeur (CPU)',     'right' => 'Composant interne'],
            ['left' => 'Écran (moniteur)',     'right' => 'Périphérique externe'],
            ['left' => 'Barrette de RAM',      'right' => 'Composant interne'],
            ['left' => 'Imprimante',           'right' => 'Périphérique externe'],
            ['left' => 'Alimentation (PSU)',   'right' => 'Composant interne'],
            ['left' => 'Souris',               'right' => 'Périphérique externe'],
        ]);
    }

    // ── Chapter 3 : Processeur ────────────────────────────────────────────────

    private function chapter3(Course $course): void
    {
        $ch = $this->makeChapter($course, 'Le Processeur (CPU)', 2);

        $this->makeResource($ch, $course, [
            'type' => 'presentation', 'file_type' => 'link',
            'title' => 'Vidéo — Comment fonctionne un processeur ?',
            'external_url' => null, 'order' => 0,
        ]);

        $r = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'qcm',
            'title' => 'QCM — Le Processeur', 'order' => 1,
        ]);
        $this->qcmProcesseur($r);

        $r2 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'drag_drop',
            'title' => 'Drag & Drop — Composants et rôles du CPU', 'order' => 2,
        ]);
        $this->exDragDrop($r2, 'Associe chaque élément du CPU à son rôle.', [
            ['left' => 'ALU (Unité Arithmétique et Logique)', 'right' => 'Effectue les calculs'],
            ['left' => 'Unité de contrôle',                  'right' => 'Coordonne les instructions'],
            ['left' => 'Cache L1',                           'right' => 'Mémoire ultra-rapide du CPU'],
            ['left' => 'Registres',                          'right' => 'Stockage temporaire dans le CPU'],
            ['left' => 'Horloge (clock)',                    'right' => 'Cadence les opérations (GHz)'],
            ['left' => 'Bus système',                        'right' => 'Relie le CPU à la mémoire'],
        ]);

        $r3 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'fill_blanks',
            'title' => 'Compléter — Le cycle Fetch-Decode-Execute', 'order' => 3,
        ]);
        $this->exFillBlanks($r3,
            'Le processeur exécute les instructions selon un cycle en 3 étapes. ' .
            'D\'abord il [[récupère]] (fetch) l\'instruction depuis la mémoire. ' .
            'Ensuite il la [[décode]] pour comprendre ce qu\'elle demande. ' .
            'Enfin il l\'[[exécute]] et stocke le résultat dans un [[registre]]. ' .
            'La fréquence de ce cycle est mesurée en [[GHz]].',
            false
        );

        $r4 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'ordering',
            'title' => 'Ordonner — Les générations de processeurs Intel Core', 'order' => 4,
        ]);
        $this->exOrdering($r4, 'Remets ces générations de processeurs dans l\'ordre chronologique (du plus ancien au plus récent).', [
            'Intel Core i (1ère génération) — Nehalem (2008)',
            'Intel Core i (2e génération) — Sandy Bridge (2011)',
            'Intel Core i (4e génération) — Haswell (2013)',
            'Intel Core i (8e génération) — Coffee Lake (2017)',
            'Intel Core i (12e génération) — Alder Lake (2021)',
        ]);

        $r5 = $this->makeResource($ch, $course, [
            'type' => 'revision', 'file_type' => 'qcm',
            'title' => 'Révision — Le Processeur', 'order' => 5,
        ]);
        $this->qcmRevisionProcesseur($r5);
    }

    // ── Chapter 4 : Mémoire ───────────────────────────────────────────────────

    private function chapter4(Course $course): void
    {
        $ch = $this->makeChapter($course, 'La Mémoire (RAM, ROM, Cache)', 3);

        $this->makeResource($ch, $course, [
            'type' => 'presentation', 'file_type' => 'link',
            'title' => 'Vidéo — Types de mémoire dans un ordinateur',
            'external_url' => null, 'order' => 0,
        ]);

        $r = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'qcm',
            'title' => 'QCM — La Mémoire', 'order' => 1,
        ]);
        $this->qcmMemoire($r);

        $r2 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'drag_drop',
            'title' => 'Drag & Drop — RAM vs ROM vs Cache', 'order' => 2,
        ]);
        $this->exDragDrop($r2, 'Classe chaque caractéristique dans la bonne catégorie de mémoire.', [
            ['left' => 'Volatile (perdue à l\'extinction)',        'right' => 'RAM'],
            ['left' => 'Contient le BIOS/UEFI',                   'right' => 'ROM'],
            ['left' => 'Accessible directement par le CPU',       'right' => 'Cache'],
            ['left' => 'Modifiable par l\'utilisateur',           'right' => 'RAM'],
            ['left' => 'Non volatile (conservée sans courant)',    'right' => 'ROM'],
            ['left' => 'La plus rapide des trois',                'right' => 'Cache'],
            ['left' => 'Mesurée en Go (gigaoctets)',              'right' => 'RAM'],
            ['left' => 'Intégrée dans le processeur',            'right' => 'Cache'],
        ]);

        $r3 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'fill_blanks',
            'title' => 'Compléter — La hiérarchie mémoire', 'order' => 3,
        ]);
        $this->exFillBlanks($r3,
            'La hiérarchie mémoire classe les mémoires par vitesse et capacité. ' .
            'Le cache [[L1]] est le plus proche du processeur et le plus rapide. ' .
            'La [[RAM]] est la mémoire vive principale, utilisée par les programmes en cours d\'exécution. ' .
            'Le [[disque dur]] (ou SSD) constitue la mémoire de masse permanente. ' .
            'Plus une mémoire est rapide, plus elle est [[coûteuse]] et [[petite]] en capacité.',
            false
        );

        $r4 = $this->makeResource($ch, $course, [
            'type' => 'revision', 'file_type' => 'qcm',
            'title' => 'Révision — La Mémoire', 'order' => 4,
        ]);
        $this->qcmRevisionMemoire($r4);
    }

    // ── Chapter 5 : Stockage ──────────────────────────────────────────────────

    private function chapter5(Course $course): void
    {
        $ch = $this->makeChapter($course, 'Le Stockage (HDD, SSD, NVMe)', 4);

        $this->makeResource($ch, $course, [
            'type' => 'presentation', 'file_type' => 'link',
            'title' => 'Vidéo — HDD vs SSD : comment ça marche ?',
            'external_url' => null, 'order' => 0,
        ]);

        $r = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'qcm',
            'title' => 'QCM — Le Stockage', 'order' => 1,
        ]);
        $this->qcmStockage($r);

        $r2 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'drag_drop',
            'title' => 'Drag & Drop — HDD vs SSD vs NVMe', 'order' => 2,
        ]);
        $this->exDragDrop($r2, 'Associe chaque caractéristique au bon type de stockage.', [
            ['left' => 'Plateaux magnétiques en rotation',         'right' => 'HDD'],
            ['left' => 'Mémoire flash NAND',                      'right' => 'SSD'],
            ['left' => 'Interface PCIe (très haute vitesse)',      'right' => 'NVMe'],
            ['left' => 'Le moins cher par Go',                    'right' => 'HDD'],
            ['left' => 'Résiste aux chocs (pas de pièces mobiles)','right' => 'SSD'],
            ['left' => 'Débits > 3 000 Mo/s possibles',           'right' => 'NVMe'],
            ['left' => 'Tête de lecture mécanique',               'right' => 'HDD'],
            ['left' => 'Format M.2 courant',                      'right' => 'NVMe'],
        ]);

        $r3 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'fill_blanks',
            'title' => 'Compléter — HDD vs SSD', 'order' => 3,
        ]);
        $this->exFillBlanks($r3,
            'Le disque dur ([[HDD]]) utilise des plateaux magnétiques en rotation pour stocker les données. ' .
            'Sa vitesse de rotation est mesurée en [[RPM]] (tours par minute). ' .
            'Le SSD (Solid State Drive) utilise de la mémoire [[flash]] sans pièce mobile, ce qui le rend plus [[rapide]] et plus résistant aux [[chocs]]. ' .
            'Un SSD NVMe connecté en [[PCIe]] est encore plus rapide qu\'un SSD SATA classique.',
            false
        );

        $r4 = $this->makeResource($ch, $course, [
            'type' => 'revision', 'file_type' => 'qcm',
            'title' => 'Révision — Le Stockage', 'order' => 4,
        ]);
        $this->qcmRevisionStockage($r4);
    }

    // ── Chapter 6 : Carte Mère ────────────────────────────────────────────────

    private function chapter6(Course $course): void
    {
        $ch = $this->makeChapter($course, 'La Carte Mère (Motherboard)', 5);

        $this->makeResource($ch, $course, [
            'type' => 'presentation', 'file_type' => 'link',
            'title' => 'Vidéo — Anatomie d\'une carte mère',
            'external_url' => null, 'order' => 0,
        ]);

        $r = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'qcm',
            'title' => 'QCM — La Carte Mère', 'order' => 1,
        ]);
        $this->qcmCarteMere($r);

        $r2 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'drag_drop',
            'title' => 'Drag & Drop — Composants et connecteurs de la carte mère', 'order' => 2,
        ]);
        $this->exDragDrop($r2, 'Associe chaque connecteur/slot à ce qu\'il accueille.', [
            ['left' => 'Socket LGA/AM5',          'right' => 'Processeur (CPU)'],
            ['left' => 'Slot DIMM',               'right' => 'Barrette RAM'],
            ['left' => 'Slot PCIe x16',           'right' => 'Carte graphique'],
            ['left' => 'Connecteur SATA',         'right' => 'Disque dur / SSD SATA'],
            ['left' => 'Slot M.2',                'right' => 'SSD NVMe'],
            ['left' => 'Connecteur ATX 24 broches','right' => 'Alimentation principale'],
            ['left' => 'Puce chipset',            'right' => 'Gestion des communications'],
            ['left' => 'Ports USB arrière',       'right' => 'Périphériques externes'],
        ]);

        $r3 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'fill_blanks',
            'title' => 'Compléter — Le rôle de la carte mère', 'order' => 3,
        ]);
        $this->exFillBlanks($r3,
            'La carte mère est le composant central qui relie tous les autres composants. ' .
            'Elle contient le [[socket]] dans lequel s\'insère le processeur. ' .
            'Le [[BIOS]] (ou UEFI) est un firmware stocké sur la carte mère qui démarre l\'ordinateur. ' .
            'Le [[chipset]] gère les communications entre le CPU, la RAM et les périphériques. ' .
            'Le facteur de forme le plus courant pour les PC de bureau est l\'[[ATX]].',
            false
        );
    }

    // ── Chapter 7 : Carte Graphique ───────────────────────────────────────────

    private function chapter7(Course $course): void
    {
        $ch = $this->makeChapter($course, 'La Carte Graphique (GPU)', 6);

        $this->makeResource($ch, $course, [
            'type' => 'presentation', 'file_type' => 'link',
            'title' => 'Vidéo — CPU vs GPU : quelle différence ?',
            'external_url' => null, 'order' => 0,
        ]);

        $r = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'qcm',
            'title' => 'QCM — La Carte Graphique', 'order' => 1,
        ]);
        $this->qcmCarteGraphique($r);

        $r2 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'drag_drop',
            'title' => 'Drag & Drop — CPU vs GPU', 'order' => 2,
        ]);
        $this->exDragDrop($r2, 'Classe chaque caractéristique dans la bonne colonne.', [
            ['left' => 'Quelques cœurs très puissants',          'right' => 'CPU'],
            ['left' => 'Des milliers de petits cœurs parallèles', 'right' => 'GPU'],
            ['left' => 'Idéal pour les tâches séquentielles',    'right' => 'CPU'],
            ['left' => 'Idéal pour le rendu 3D et le jeu',       'right' => 'GPU'],
            ['left' => 'Contient la VRAM (mémoire vidéo)',        'right' => 'GPU'],
            ['left' => 'Exécute le système d\'exploitation',     'right' => 'CPU'],
            ['left' => 'Utilisé pour l\'intelligence artificielle','right' => 'GPU'],
            ['left' => 'Cache L1/L2/L3 intégré',                 'right' => 'CPU'],
        ]);

        $r3 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'fill_blanks',
            'title' => 'Compléter — La carte graphique', 'order' => 3,
        ]);
        $this->exFillBlanks($r3,
            'La carte graphique contient un processeur graphique appelé [[GPU]]. ' .
            'Elle dispose de sa propre mémoire vidéo appelée [[VRAM]]. ' .
            'Elle est connectée à la carte mère via un slot [[PCIe]] x16. ' .
            'Les principaux fabricants de GPU sont [[NVIDIA]] et [[AMD]]. ' .
            'Une carte graphique intégrée (iGPU) est directement intégrée dans le [[processeur]].',
            false
        );
    }

    // ── Chapter 8 : Bus ───────────────────────────────────────────────────────

    private function chapter8(Course $course): void
    {
        $ch = $this->makeChapter($course, 'Les Bus et l\'Architecture interne', 7);

        $this->makeResource($ch, $course, [
            'type' => 'presentation', 'file_type' => 'link',
            'title' => 'Vidéo — Les bus informatiques expliqués',
            'external_url' => null, 'order' => 0,
        ]);

        $r = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'qcm',
            'title' => 'QCM — Les Bus informatiques', 'order' => 1,
        ]);
        $this->qcmBus($r);

        $r2 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'drag_drop',
            'title' => 'Drag & Drop — Types de bus', 'order' => 2,
        ]);
        $this->exDragDrop($r2, 'Associe chaque bus à sa fonction principale.', [
            ['left' => 'Bus de données',          'right' => 'Transporte les données entre composants'],
            ['left' => 'Bus d\'adresses',         'right' => 'Indique l\'emplacement mémoire visé'],
            ['left' => 'Bus de contrôle',         'right' => 'Transporte les signaux de commande'],
            ['left' => 'Bus PCIe',               'right' => 'Relie la carte graphique à la carte mère'],
            ['left' => 'Bus SATA',               'right' => 'Connecte les disques de stockage'],
            ['left' => 'Bus USB',                'right' => 'Connecte les périphériques externes'],
            ['left' => 'Bus FSB (Front Side Bus)','right' => 'Ancien bus reliant CPU et RAM'],
            ['left' => 'Bus mémoire (DDR)',      'right' => 'Relie le CPU aux barrettes RAM'],
        ]);

        $r3 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'truth_table',
            'title' => 'Table de vérité — Portes logiques AND et OR', 'order' => 3,
        ]);
        $this->exTruthTable($r3,
            'Complète la table de vérité pour les portes logiques AND et OR.',
            ['A', 'B'],
            ['AND', 'OR', 'NOT A'],
            [
                ['inputs' => [0, 0], 'outputs' => [0, 0, 1]],
                ['inputs' => [0, 1], 'outputs' => [0, 1, 1]],
                ['inputs' => [1, 0], 'outputs' => [0, 1, 0]],
                ['inputs' => [1, 1], 'outputs' => [1, 1, 0]],
            ]
        );

        $r4 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'fill_blanks',
            'title' => 'Compléter — Les bus informatiques', 'order' => 4,
        ]);
        $this->exFillBlanks($r4,
            'Un bus informatique est un ensemble de fils qui permettent de transférer des [[données]] entre les composants. ' .
            'La largeur d\'un bus est mesurée en [[bits]] ; un bus 32 bits peut transmettre 32 bits simultanément. ' .
            'La fréquence du bus détermine sa [[bande passante]], c\'est-à-dire la quantité de données transférées par seconde. ' .
            'Le bus [[PCIe]] a progressivement remplacé l\'ancien bus AGP pour les cartes graphiques.',
            false
        );
    }

    // ── Chapter 9 : Périphériques ─────────────────────────────────────────────

    private function chapter9(Course $course): void
    {
        $ch = $this->makeChapter($course, 'Les Périphériques', 8);

        $this->makeResource($ch, $course, [
            'type' => 'presentation', 'file_type' => 'link',
            'title' => 'Vidéo — Classification des périphériques',
            'external_url' => null, 'order' => 0,
        ]);

        $r = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'qcm',
            'title' => 'QCM — Les Périphériques', 'order' => 1,
        ]);
        $this->qcmPeripheriques($r);

        $r2 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'drag_drop',
            'title' => 'Drag & Drop — Classer les périphériques', 'order' => 2,
        ]);
        $this->exDragDrop($r2, 'Classe chaque périphérique selon sa catégorie.', [
            ['left' => 'Clavier',       'right' => 'Périphérique d\'entrée'],
            ['left' => 'Écran',         'right' => 'Périphérique de sortie'],
            ['left' => 'Imprimante',    'right' => 'Périphérique de sortie'],
            ['left' => 'Souris',        'right' => 'Périphérique d\'entrée'],
            ['left' => 'Microphone',    'right' => 'Périphérique d\'entrée'],
            ['left' => 'Haut-parleurs', 'right' => 'Périphérique de sortie'],
            ['left' => 'Webcam',        'right' => 'Périphérique d\'entrée/sortie'],
            ['left' => 'Disque USB',    'right' => 'Périphérique d\'entrée/sortie'],
        ]);

        $r3 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'ordering',
            'title' => 'Ordonner — Évolution des interfaces de connexion', 'order' => 3,
        ]);
        $this->exOrdering($r3, 'Remets ces interfaces de connexion dans l\'ordre chronologique d\'apparition.', [
            'Port série RS-232 (années 1960)',
            'Port parallèle (Centronics) — années 1970',
            'Port PS/2 (clavier et souris) — années 1980',
            'USB 1.0 — 1996',
            'USB 3.0 — 2008',
            'USB-C — 2014',
        ]);

        $r4 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'fill_blanks',
            'title' => 'Compléter — Les types de périphériques', 'order' => 4,
        ]);
        $this->exFillBlanks($r4,
            'Les périphériques d\'[[entrée]] permettent d\'envoyer des données vers l\'ordinateur (ex : clavier, souris). ' .
            'Les périphériques de [[sortie]] permettent à l\'ordinateur de communiquer des résultats (ex : écran, imprimante). ' .
            'Certains périphériques sont à la fois d\'entrée et de sortie, comme le [[disque dur]] externe ou la [[tablette graphique]]. ' .
            'Les pilotes ([[drivers]]) sont des logiciels qui permettent au système d\'exploitation de communiquer avec les périphériques.',
            false
        );
    }

    // ── Chapter 10 : Révision & Évaluation finale ─────────────────────────────

    private function chapter10(Course $course): void
    {
        $ch = $this->makeChapter($course, 'Révision Générale et Évaluation Finale', 9);

        $r = $this->makeResource($ch, $course, [
            'type' => 'revision', 'file_type' => 'qcm',
            'title' => 'Révision — Tous les composants (20 questions)', 'order' => 0,
        ]);
        $this->qcmRevisionFinale($r);

        $r2 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'drag_drop',
            'title' => 'Drag & Drop — Récapitulatif des composants', 'order' => 1,
        ]);
        $this->exDragDrop($r2, 'Associe chaque composant à sa description.', [
            ['left' => 'CPU',            'right' => 'Cerveau de l\'ordinateur, exécute les instructions'],
            ['left' => 'RAM',            'right' => 'Mémoire vive, volatile, stocke les programmes en cours'],
            ['left' => 'ROM/BIOS',       'right' => 'Mémoire non volatile qui démarre l\'ordinateur'],
            ['left' => 'SSD',            'right' => 'Stockage permanent sans pièce mobile'],
            ['left' => 'GPU',            'right' => 'Traitement graphique et rendu 3D'],
            ['left' => 'Carte mère',     'right' => 'Relie et connecte tous les composants'],
            ['left' => 'PSU',            'right' => 'Alimentation électrique du boîtier'],
            ['left' => 'Bus PCIe',       'right' => 'Interface haute vitesse pour GPU et SSD NVMe'],
        ]);

        $r3 = $this->makeResource($ch, $course, [
            'type' => 'evaluation', 'file_type' => 'qcm',
            'title' => 'Évaluation Finale — Les Composants de l\'Ordinateur', 'order' => 2,
        ]);
        $this->qcmEvaluationFinale($r3);

        $r4 = $this->makeResource($ch, $course, [
            'type' => 'exercise', 'file_type' => 'ordering',
            'title' => 'Ordonner — Du composant le plus rapide au plus lent', 'order' => 3,
        ]);
        $this->exOrdering($r4, 'Classe ces mémoires/stockages du plus rapide au plus lent.', [
            'Registres du CPU (ps)',
            'Cache L1 du CPU (ns)',
            'RAM DDR5 (ns)',
            'SSD NVMe PCIe (µs)',
            'SSD SATA (µs)',
            'Disque dur HDD (ms)',
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // QCM Contents
    // ══════════════════════════════════════════════════════════════════════════

    private function qcmIntroduction(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Qu\'est-ce qu\'un ordinateur ?',
                'exp' => 'Un ordinateur est une machine capable de traiter automatiquement des informations selon un programme.',
                'opts' => [
                    ['l' => 'Une machine programmable capable de traiter des informations', 'c' => true],
                    ['l' => 'Un appareil uniquement destiné à jouer à des jeux', 'c' => false],
                    ['l' => 'Un périphérique d\'entrée comme le clavier', 'c' => false],
                    ['l' => 'Un type de réseau informatique', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel composant est souvent appelé le "cerveau" de l\'ordinateur ?',
                'exp' => 'Le processeur (CPU) exécute toutes les instructions et coordonne les autres composants.',
                'opts' => [
                    ['l' => 'La RAM', 'c' => false],
                    ['l' => 'Le processeur (CPU)', 'c' => true],
                    ['l' => 'La carte mère', 'c' => false],
                    ['l' => 'Le disque dur', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle est la différence entre la mémoire vive (RAM) et le stockage (disque dur) ?',
                'exp' => 'La RAM est volatile (perdue à l\'extinction) et rapide ; le disque dur est permanent mais plus lent.',
                'opts' => [
                    ['l' => 'La RAM est permanente, le disque dur est temporaire', 'c' => false],
                    ['l' => 'La RAM est volatile et rapide, le disque est permanent mais plus lent', 'c' => true],
                    ['l' => 'Il n\'y a aucune différence', 'c' => false],
                    ['l' => 'La RAM stocke les vidéos, le disque dur les programmes', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que le modèle de Von Neumann ?',
                'exp' => 'Le modèle de Von Neumann décrit une architecture d\'ordinateur avec une mémoire commune pour les données et les instructions.',
                'opts' => [
                    ['l' => 'Un type de processeur multi-cœurs', 'c' => false],
                    ['l' => 'Une architecture d\'ordinateur avec mémoire partagée pour données et instructions', 'c' => true],
                    ['l' => 'Un protocole réseau', 'c' => false],
                    ['l' => 'Un type de carte graphique', 'c' => false],
                ],
            ],
            [
                'q' => 'Parmi ces éléments, lequel N\'est PAS un composant interne typique d\'un PC ?',
                'exp' => 'La souris est un périphérique externe. CPU, RAM et carte mère sont des composants internes.',
                'opts' => [
                    ['l' => 'Le processeur (CPU)', 'c' => false],
                    ['l' => 'La barrette de RAM', 'c' => false],
                    ['l' => 'La souris', 'c' => true],
                    ['l' => 'La carte mère', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmUniteCentrale(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Que contient le boîtier (unité centrale) d\'un ordinateur de bureau ?',
                'exp' => 'Le boîtier contient la carte mère, le CPU, la RAM, les disques et l\'alimentation.',
                'opts' => [
                    ['l' => 'Uniquement le processeur', 'c' => false],
                    ['l' => 'La carte mère, le CPU, la RAM, les disques et l\'alimentation', 'c' => true],
                    ['l' => 'Seulement l\'alimentation et les ventilateurs', 'c' => false],
                    ['l' => 'L\'écran et les haut-parleurs', 'c' => false],
                ],
            ],
            [
                'q' => 'À quoi sert l\'alimentation (PSU) dans un boîtier PC ?',
                'exp' => 'La PSU convertit le courant alternatif du secteur en courant continu utilisable par les composants.',
                'opts' => [
                    ['l' => 'À refroidir le processeur', 'c' => false],
                    ['l' => 'À convertir le courant alternatif en courant continu', 'c' => true],
                    ['l' => 'À stocker les données', 'c' => false],
                    ['l' => 'À connecter les périphériques USB', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel est le rôle principal des ventilateurs dans un boîtier PC ?',
                'exp' => 'Les ventilateurs assurent la circulation d\'air pour évacuer la chaleur produite par les composants.',
                'opts' => [
                    ['l' => 'Augmenter la vitesse du processeur', 'c' => false],
                    ['l' => 'Évacuer la chaleur pour refroidir les composants', 'c' => true],
                    ['l' => 'Alimenter la carte mère en électricité', 'c' => false],
                    ['l' => 'Lire les CD/DVD', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que le facteur de forme d\'un boîtier ?',
                'exp' => 'Le facteur de forme (ATX, mATX, ITX) détermine les dimensions et la compatibilité avec la carte mère.',
                'opts' => [
                    ['l' => 'La couleur et le design esthétique du boîtier', 'c' => false],
                    ['l' => 'Les dimensions et la compatibilité avec la carte mère', 'c' => true],
                    ['l' => 'Le nombre de ports USB disponibles', 'c' => false],
                    ['l' => 'La puissance de l\'alimentation en watts', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmProcesseur(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Que signifie l\'acronyme CPU ?',
                'exp' => 'CPU = Central Processing Unit (Unité Centrale de Traitement).',
                'opts' => [
                    ['l' => 'Central Power Unit', 'c' => false],
                    ['l' => 'Central Processing Unit', 'c' => true],
                    ['l' => 'Computer Processing Utility', 'c' => false],
                    ['l' => 'Control Panel Unit', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que la fréquence d\'horloge d\'un processeur ?',
                'exp' => 'La fréquence (en GHz) indique le nombre de cycles par seconde que le CPU peut effectuer.',
                'opts' => [
                    ['l' => 'Le nombre de cœurs du processeur', 'c' => false],
                    ['l' => 'Le nombre de cycles par seconde (en GHz)', 'c' => true],
                    ['l' => 'La quantité de mémoire cache', 'c' => false],
                    ['l' => 'La consommation électrique en watts', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce qu\'un processeur multi-cœurs ?',
                'exp' => 'Un processeur multi-cœurs contient plusieurs unités de traitement indépendantes sur la même puce.',
                'opts' => [
                    ['l' => 'Un processeur avec plusieurs refroidisseurs', 'c' => false],
                    ['l' => 'Un processeur avec plusieurs unités de traitement sur la même puce', 'c' => true],
                    ['l' => 'Deux processeurs séparés sur la même carte mère', 'c' => false],
                    ['l' => 'Un processeur pour les jeux uniquement', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle est la fonction de la mémoire cache du processeur ?',
                'exp' => 'Le cache stocke temporairement les données fréquemment utilisées pour accélérer les accès du CPU.',
                'opts' => [
                    ['l' => 'Stocker les fichiers de l\'utilisateur', 'c' => false],
                    ['l' => 'Stocker temporairement les données fréquemment utilisées par le CPU', 'c' => true],
                    ['l' => 'Remplacer la RAM en cas de panne', 'c' => false],
                    ['l' => 'Connecter le CPU à la carte graphique', 'c' => false],
                ],
            ],
            [
                'q' => 'Que signifie "overclocking" ?',
                'exp' => 'L\'overclocking consiste à augmenter la fréquence d\'horloge au-delà des spécifications du fabricant.',
                'opts' => [
                    ['l' => 'Réduire la fréquence pour économiser l\'énergie', 'c' => false],
                    ['l' => 'Augmenter la fréquence au-delà des specs du fabricant', 'c' => true],
                    ['l' => 'Installer plusieurs processeurs', 'c' => false],
                    ['l' => 'Mettre à jour le BIOS', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que l\'ALU dans un processeur ?',
                'exp' => 'L\'ALU (Arithmetic Logic Unit) effectue les opérations arithmétiques et logiques.',
                'opts' => [
                    ['l' => 'Une mémoire cache de niveau 1', 'c' => false],
                    ['l' => 'L\'unité qui effectue les calculs arithmétiques et logiques', 'c' => true],
                    ['l' => 'Le bus qui relie le CPU à la RAM', 'c' => false],
                    ['l' => 'L\'unité de gestion de l\'alimentation', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmMemoire(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Que signifie RAM ?',
                'exp' => 'RAM = Random Access Memory (Mémoire vive à accès aléatoire).',
                'opts' => [
                    ['l' => 'Read And Memorize', 'c' => false],
                    ['l' => 'Random Access Memory', 'c' => true],
                    ['l' => 'Rapid Application Module', 'c' => false],
                    ['l' => 'Read Access Memory', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle est la caractéristique principale de la RAM ?',
                'exp' => 'La RAM est volatile : son contenu est perdu lorsque l\'ordinateur est éteint.',
                'opts' => [
                    ['l' => 'Elle conserve les données sans courant électrique', 'c' => false],
                    ['l' => 'Son contenu est perdu à l\'extinction de l\'ordinateur', 'c' => true],
                    ['l' => 'Elle est plus lente que le disque dur', 'c' => false],
                    ['l' => 'Elle stocke le système d\'exploitation de façon permanente', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que la ROM ?',
                'exp' => 'La ROM (Read Only Memory) est une mémoire non volatile qui contient des données permanentes comme le BIOS.',
                'opts' => [
                    ['l' => 'Une mémoire vive très rapide', 'c' => false],
                    ['l' => 'Une mémoire non volatile contenant des données permanentes (ex: BIOS)', 'c' => true],
                    ['l' => 'Un type de disque dur', 'c' => false],
                    ['l' => 'La mémoire vidéo de la carte graphique', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que la DDR5 ?',
                'exp' => 'DDR5 est la 5e génération de RAM double débit de données, plus rapide que la DDR4.',
                'opts' => [
                    ['l' => 'Un type de disque SSD', 'c' => false],
                    ['l' => 'La 5e génération de RAM à double débit de données', 'c' => true],
                    ['l' => 'Un format de carte mère', 'c' => false],
                    ['l' => 'Un protocole de connexion PCIe', 'c' => false],
                ],
            ],
            [
                'q' => 'Pourquoi plus de RAM améliore généralement les performances ?',
                'exp' => 'Plus de RAM permet de charger plus de données et programmes en mémoire, évitant d\'aller chercher sur le disque.',
                'opts' => [
                    ['l' => 'Elle augmente la fréquence du processeur', 'c' => false],
                    ['l' => 'Elle permet de charger plus de données sans accéder au disque lent', 'c' => true],
                    ['l' => 'Elle améliore la qualité de l\'affichage', 'c' => false],
                    ['l' => 'Elle refroidit le processeur', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmStockage(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Que signifie HDD ?',
                'exp' => 'HDD = Hard Disk Drive (disque dur magnétique).',
                'opts' => [
                    ['l' => 'High Definition Display', 'c' => false],
                    ['l' => 'Hard Disk Drive', 'c' => true],
                    ['l' => 'Hybrid Data Device', 'c' => false],
                    ['l' => 'High Data Density', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle technologie utilise un SSD pour stocker les données ?',
                'exp' => 'Un SSD utilise de la mémoire flash NAND, sans pièces mécaniques mobiles.',
                'opts' => [
                    ['l' => 'Des plateaux magnétiques en rotation', 'c' => false],
                    ['l' => 'De la mémoire flash NAND', 'c' => true],
                    ['l' => 'De la mémoire RAM volatile', 'c' => false],
                    ['l' => 'Des disques optiques', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel est l\'avantage principal d\'un SSD par rapport à un HDD ?',
                'exp' => 'Les SSD sont beaucoup plus rapides que les HDD car ils n\'ont pas de pièces mécaniques.',
                'opts' => [
                    ['l' => 'Il est moins cher par gigaoctet', 'c' => false],
                    ['l' => 'Il est plus rapide et résistant aux chocs', 'c' => true],
                    ['l' => 'Il a une plus grande capacité de stockage', 'c' => false],
                    ['l' => 'Il consomme plus d\'énergie', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce qu\'un SSD NVMe ?',
                'exp' => 'NVMe (Non-Volatile Memory Express) est un protocole haute performance pour SSD utilisant le bus PCIe.',
                'opts' => [
                    ['l' => 'Un SSD qui utilise l\'interface SATA', 'c' => false],
                    ['l' => 'Un SSD haute performance utilisant le bus PCIe', 'c' => true],
                    ['l' => 'Un HDD de nouvelle génération', 'c' => false],
                    ['l' => 'Un disque externe USB', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle unité mesure la vitesse de rotation d\'un HDD ?',
                'exp' => 'La vitesse de rotation d\'un HDD est mesurée en RPM (Rotations Par Minute).',
                'opts' => [
                    ['l' => 'GHz', 'c' => false],
                    ['l' => 'RPM (Rotations Par Minute)', 'c' => true],
                    ['l' => 'Mo/s', 'c' => false],
                    ['l' => 'Watts', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmCarteMere(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Quel est le rôle principal de la carte mère ?',
                'exp' => 'La carte mère est le circuit imprimé principal qui relie et permet la communication entre tous les composants.',
                'opts' => [
                    ['l' => 'Stocker les données du système d\'exploitation', 'c' => false],
                    ['l' => 'Relier et permettre la communication entre tous les composants', 'c' => true],
                    ['l' => 'Alimenter les composants en électricité', 'c' => false],
                    ['l' => 'Effectuer les calculs graphiques', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que le BIOS/UEFI ?',
                'exp' => 'Le BIOS/UEFI est un firmware stocké sur la carte mère qui initialise le matériel et démarre le système.',
                'opts' => [
                    ['l' => 'Un système d\'exploitation alternatif', 'c' => false],
                    ['l' => 'Un firmware qui initialise le matériel et lance le démarrage', 'c' => true],
                    ['l' => 'Un type de processeur', 'c' => false],
                    ['l' => 'Un logiciel de gestion de virus', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que le chipset d\'une carte mère ?',
                'exp' => 'Le chipset est un ensemble de circuits qui gère les échanges entre le CPU, la RAM, et les périphériques.',
                'opts' => [
                    ['l' => 'Un type de socket pour le CPU', 'c' => false],
                    ['l' => 'Un ensemble de circuits gérant les communications entre composants', 'c' => true],
                    ['l' => 'La mémoire cache intégrée', 'c' => false],
                    ['l' => 'Le connecteur d\'alimentation de la carte mère', 'c' => false],
                ],
            ],
            [
                'q' => 'Que signifie ATX dans le contexte des cartes mères ?',
                'exp' => 'ATX (Advanced Technology eXtended) est le facteur de forme standard pour les cartes mères de bureau.',
                'opts' => [
                    ['l' => 'Advanced Transfer eXchange', 'c' => false],
                    ['l' => 'Advanced Technology eXtended — facteur de forme standard', 'c' => true],
                    ['l' => 'Automatic Task eXecution', 'c' => false],
                    ['l' => 'Un type de slot mémoire', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmCarteGraphique(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Que signifie GPU ?',
                'exp' => 'GPU = Graphics Processing Unit (Unité de traitement graphique).',
                'opts' => [
                    ['l' => 'General Processing Unit', 'c' => false],
                    ['l' => 'Graphics Processing Unit', 'c' => true],
                    ['l' => 'Graphical Power Utility', 'c' => false],
                    ['l' => 'Global Parallel Unit', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle est la principale différence entre un iGPU et un GPU dédié ?',
                'exp' => 'L\'iGPU est intégré au CPU et partage la RAM ; le GPU dédié a sa propre VRAM et est bien plus puissant.',
                'opts' => [
                    ['l' => 'L\'iGPU est plus puissant qu\'un GPU dédié', 'c' => false],
                    ['l' => 'L\'iGPU est intégré au CPU et partage la RAM ; le GPU dédié a sa propre VRAM', 'c' => true],
                    ['l' => 'Un iGPU ne peut pas afficher de vidéo', 'c' => false],
                    ['l' => 'Les deux sont identiques en termes de performances', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que la VRAM ?',
                'exp' => 'La VRAM (Video RAM) est la mémoire dédiée de la carte graphique, qui stocke les textures et le framebuffer.',
                'opts' => [
                    ['l' => 'La RAM principale de l\'ordinateur', 'c' => false],
                    ['l' => 'La mémoire dédiée de la carte graphique', 'c' => true],
                    ['l' => 'Un type de stockage SSD pour vidéos', 'c' => false],
                    ['l' => 'La mémoire cache du processeur', 'c' => false],
                ],
            ],
            [
                'q' => 'Pourquoi le GPU est-il plus efficace que le CPU pour le rendu 3D ?',
                'exp' => 'Le GPU contient des milliers de petits cœurs permettant un traitement massivement parallèle des pixels.',
                'opts' => [
                    ['l' => 'Parce qu\'il a une fréquence plus élevée', 'c' => false],
                    ['l' => 'Parce qu\'il dispose de milliers de cœurs pour un traitement parallèle', 'c' => true],
                    ['l' => 'Parce qu\'il est directement connecté à l\'écran', 'c' => false],
                    ['l' => 'Parce qu\'il a plus de mémoire cache', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmBus(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Qu\'est-ce qu\'un bus informatique ?',
                'exp' => 'Un bus est un ensemble de lignes de communication qui transportent des données entre les composants.',
                'opts' => [
                    ['l' => 'Un programme de gestion de la mémoire', 'c' => false],
                    ['l' => 'Un ensemble de lignes qui transportent des données entre composants', 'c' => true],
                    ['l' => 'Un type de processeur', 'c' => false],
                    ['l' => 'Un protocole réseau', 'c' => false],
                ],
            ],
            [
                'q' => 'Quels sont les trois types de signaux transportés par les bus ?',
                'exp' => 'Un bus transporte trois types de signaux : données, adresses et contrôle.',
                'opts' => [
                    ['l' => 'Électricité, données, son', 'c' => false],
                    ['l' => 'Données, adresses et contrôle', 'c' => true],
                    ['l' => 'Entrée, traitement, sortie', 'c' => false],
                    ['l' => 'RAM, ROM, cache', 'c' => false],
                ],
            ],
            [
                'q' => 'Que signifie PCIe ?',
                'exp' => 'PCIe = Peripheral Component Interconnect Express, interface haute vitesse pour cartes d\'extension.',
                'opts' => [
                    ['l' => 'Programmable Controller Interface Engine', 'c' => false],
                    ['l' => 'Peripheral Component Interconnect Express', 'c' => true],
                    ['l' => 'Personal Computer Internal Extension', 'c' => false],
                    ['l' => 'Power Component Interface Express', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle est la largeur d\'un bus 64 bits ?',
                'exp' => 'Un bus 64 bits peut transporter 64 bits (8 octets) simultanément.',
                'opts' => [
                    ['l' => '8 bits à la fois', 'c' => false],
                    ['l' => '32 bits à la fois', 'c' => false],
                    ['l' => '64 bits (8 octets) simultanément', 'c' => true],
                    ['l' => '128 bits à la fois', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmPeripheriques(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Comment classe-t-on les périphériques informatiques ?',
                'exp' => 'Les périphériques sont classés en entrée (données vers PC), sortie (PC vers utilisateur) ou mixte.',
                'opts' => [
                    ['l' => 'Par marque et par prix', 'c' => false],
                    ['l' => 'En périphériques d\'entrée, de sortie ou mixtes', 'c' => true],
                    ['l' => 'Par connexion filaire ou sans fil uniquement', 'c' => false],
                    ['l' => 'Par taille physique', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce qu\'un driver (pilote) ?',
                'exp' => 'Un driver est un logiciel permettant au système d\'exploitation de communiquer avec un périphérique.',
                'opts' => [
                    ['l' => 'Un programme antivirus', 'c' => false],
                    ['l' => 'Un logiciel permettant au système de communiquer avec un périphérique', 'c' => true],
                    ['l' => 'Un type de câble de connexion', 'c' => false],
                    ['l' => 'Un composant matériel de la carte mère', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel connecteur est aujourd\'hui le plus universel pour connecter des périphériques ?',
                'exp' => 'L\'USB (Universal Serial Bus) est le standard universel actuel pour connecter les périphériques.',
                'opts' => [
                    ['l' => 'Port série RS-232', 'c' => false],
                    ['l' => 'USB (Universal Serial Bus)', 'c' => true],
                    ['l' => 'Port parallèle', 'c' => false],
                    ['l' => 'PS/2', 'c' => false],
                ],
            ],
            [
                'q' => 'La webcam est un périphérique de quel type ?',
                'exp' => 'La webcam capture des images (entrée) et peut recevoir des signaux de contrôle (sortie) — périphérique mixte.',
                'opts' => [
                    ['l' => 'Uniquement d\'entrée', 'c' => false],
                    ['l' => 'Uniquement de sortie', 'c' => false],
                    ['l' => 'Mixte (entrée/sortie)', 'c' => true],
                    ['l' => 'Ni entrée ni sortie', 'c' => false],
                ],
            ],
            [
                'q' => 'Que fait le pilote (driver) d\'un périphérique ?',
                'exp' => 'Le driver traduit les commandes génériques du système en instructions spécifiques au périphérique.',
                'opts' => [
                    ['l' => 'Il alimente le périphérique en électricité', 'c' => false],
                    ['l' => 'Il traduit les commandes du système en instructions spécifiques au périphérique', 'c' => true],
                    ['l' => 'Il stocke les données du périphérique', 'c' => false],
                    ['l' => 'Il protège le périphérique contre les virus', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    // ── Révisions ─────────────────────────────────────────────────────────────

    private function qcmRevisionGenerale(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Quelle unité mesure la fréquence d\'un processeur ?',
                'exp' => 'La fréquence se mesure en Hertz (Hz), généralement en GigaHertz (GHz) pour les processeurs modernes.',
                'opts' => [
                    ['l' => 'Watts', 'c' => false],
                    ['l' => 'GHz (GigaHertz)', 'c' => true],
                    ['l' => 'Go (GigaOctets)', 'c' => false],
                    ['l' => 'RPM', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel composant contient le BIOS ?',
                'exp' => 'Le BIOS/UEFI est stocké dans une puce ROM sur la carte mère.',
                'opts' => [
                    ['l' => 'La RAM', 'c' => false],
                    ['l' => 'La carte mère (puce ROM)', 'c' => true],
                    ['l' => 'Le processeur', 'c' => false],
                    ['l' => 'Le disque dur', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel est le rôle du bus de données ?',
                'exp' => 'Le bus de données transporte les données entre les composants (CPU, mémoire, périphériques).',
                'opts' => [
                    ['l' => 'Indiquer l\'adresse mémoire à accéder', 'c' => false],
                    ['l' => 'Transporter les données entre composants', 'c' => true],
                    ['l' => 'Fournir l\'alimentation électrique', 'c' => false],
                    ['l' => 'Synchroniser les horloges', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmRevisionProcesseur(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Dans le cycle Fetch-Decode-Execute, que signifie "Fetch" ?',
                'exp' => 'Fetch = récupérer l\'instruction depuis la mémoire.',
                'opts' => [
                    ['l' => 'Décoder l\'instruction', 'c' => false],
                    ['l' => 'Récupérer l\'instruction depuis la mémoire', 'c' => true],
                    ['l' => 'Exécuter l\'instruction', 'c' => false],
                    ['l' => 'Stocker le résultat', 'c' => false],
                ],
            ],
            [
                'q' => 'Un processeur 4 GHz peut théoriquement effectuer combien de cycles par seconde ?',
                'exp' => '4 GHz = 4 milliards de cycles par seconde (4 × 10⁹ Hz).',
                'opts' => [
                    ['l' => '4 000 cycles', 'c' => false],
                    ['l' => '4 millions de cycles', 'c' => false],
                    ['l' => '4 milliards de cycles', 'c' => true],
                    ['l' => '400 millions de cycles', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmRevisionMemoire(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Laquelle de ces mémoires est la plus rapide ?',
                'exp' => 'Le cache L1, intégré dans le CPU, est la mémoire la plus rapide mais aussi la plus petite.',
                'opts' => [
                    ['l' => 'RAM DDR5', 'c' => false],
                    ['l' => 'Disque SSD NVMe', 'c' => false],
                    ['l' => 'Cache L1 du CPU', 'c' => true],
                    ['l' => 'ROM', 'c' => false],
                ],
            ],
            [
                'q' => 'Que se passe-t-il avec les données en RAM quand on éteint l\'ordinateur ?',
                'exp' => 'La RAM est volatile : toutes les données sont perdues à l\'extinction.',
                'opts' => [
                    ['l' => 'Elles sont automatiquement sauvegardées sur le disque', 'c' => false],
                    ['l' => 'Elles sont perdues (mémoire volatile)', 'c' => true],
                    ['l' => 'Elles restent en RAM grâce à une pile de secours', 'c' => false],
                    ['l' => 'Elles sont compressées', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmRevisionStockage(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Quelle interface offre les meilleures performances pour un SSD ?',
                'exp' => 'NVMe sur PCIe offre les meilleures performances, devant SATA qui est limité à ~600 Mo/s.',
                'opts' => [
                    ['l' => 'SATA III', 'c' => false],
                    ['l' => 'NVMe (PCIe)', 'c' => true],
                    ['l' => 'USB 3.0', 'c' => false],
                    ['l' => 'IDE', 'c' => false],
                ],
            ],
            [
                'q' => 'Un disque dur HDD de 7200 RPM est-il plus rapide qu\'un de 5400 RPM ?',
                'exp' => 'Oui, une vitesse de rotation plus élevée réduit le temps de positionnement et augmente le débit.',
                'opts' => [
                    ['l' => 'Non, la vitesse RPM n\'influence pas les performances', 'c' => false],
                    ['l' => 'Oui, une rotation plus rapide améliore les temps d\'accès et les débits', 'c' => true],
                    ['l' => 'Non, les deux sont identiques', 'c' => false],
                    ['l' => 'Le 5400 RPM est plus rapide car il consomme moins', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmRevisionFinale(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Quel composant exécute les instructions des programmes ?',
                'opts' => [
                    ['l' => 'RAM', 'c' => false],
                    ['l' => 'CPU', 'c' => true],
                    ['l' => 'Disque dur', 'c' => false],
                    ['l' => 'Carte mère', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle mémoire conserve ses données sans alimentation électrique ?',
                'opts' => [
                    ['l' => 'RAM', 'c' => false],
                    ['l' => 'Cache L2', 'c' => false],
                    ['l' => 'ROM', 'c' => true],
                    ['l' => 'Registres CPU', 'c' => false],
                ],
            ],
            [
                'q' => 'Un SSD est-il plus rapide qu\'un HDD ?',
                'opts' => [
                    ['l' => 'Non, le HDD est plus rapide', 'c' => false],
                    ['l' => 'Oui, car il n\'a pas de pièces mécaniques', 'c' => true],
                    ['l' => 'Ils sont identiques en vitesse', 'c' => false],
                    ['l' => 'Cela dépend uniquement de la marque', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel slot accueille la carte graphique sur une carte mère moderne ?',
                'opts' => [
                    ['l' => 'Slot DIMM', 'c' => false],
                    ['l' => 'Socket CPU', 'c' => false],
                    ['l' => 'Slot PCIe x16', 'c' => true],
                    ['l' => 'Connecteur SATA', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que la bande passante d\'un bus ?',
                'opts' => [
                    ['l' => 'Le nombre de composants connectés', 'c' => false],
                    ['l' => 'La quantité de données transportées par seconde', 'c' => true],
                    ['l' => 'La largeur physique du câble', 'c' => false],
                    ['l' => 'La fréquence d\'horloge du CPU', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel périphérique est à la fois d\'entrée et de sortie ?',
                'opts' => [
                    ['l' => 'Clavier', 'c' => false],
                    ['l' => 'Imprimante', 'c' => false],
                    ['l' => 'Écran tactile', 'c' => true],
                    ['l' => 'Microphone', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle est la fonction principale du chipset sur une carte mère ?',
                'opts' => [
                    ['l' => 'Stocker le système d\'exploitation', 'c' => false],
                    ['l' => 'Gérer les communications entre CPU, RAM et périphériques', 'c' => true],
                    ['l' => 'Alimenter les composants', 'c' => false],
                    ['l' => 'Refroidir le processeur', 'c' => false],
                ],
            ],
            [
                'q' => 'Que contient la VRAM ?',
                'opts' => [
                    ['l' => 'Les programmes en cours d\'exécution', 'c' => false],
                    ['l' => 'Le BIOS de la carte graphique', 'c' => false],
                    ['l' => 'Les textures et le framebuffer du rendu graphique', 'c' => true],
                    ['l' => 'Le système de fichiers du disque', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel format de carte mère est le plus petit : ATX, mATX ou ITX ?',
                'opts' => [
                    ['l' => 'ATX', 'c' => false],
                    ['l' => 'mATX (micro ATX)', 'c' => false],
                    ['l' => 'ITX (Mini-ITX)', 'c' => true],
                    ['l' => 'Tous ont la même taille', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle est l\'unité de mesure de la capacité de stockage ?',
                'opts' => [
                    ['l' => 'Hz (Hertz)', 'c' => false],
                    ['l' => 'Watt', 'c' => false],
                    ['l' => 'Octet (o) / Gigaoctet (Go)', 'c' => true],
                    ['l' => 'RPM', 'c' => false],
                ],
            ],
            [
                'q' => 'Lequel de ces composants fait partie du cycle Fetch-Decode-Execute ?',
                'opts' => [
                    ['l' => 'Disque dur', 'c' => false],
                    ['l' => 'Carte graphique', 'c' => false],
                    ['l' => 'Processeur (CPU)', 'c' => true],
                    ['l' => 'Alimentation (PSU)', 'c' => false],
                ],
            ],
            [
                'q' => 'Que signifie NVMe ?',
                'opts' => [
                    ['l' => 'New Volume Memory Express', 'c' => false],
                    ['l' => 'Non-Volatile Memory Express', 'c' => true],
                    ['l' => 'Next Virtual Memory Engine', 'c' => false],
                    ['l' => 'Network Volume Management Extension', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel composant gère l\'affichage sur l\'écran ?',
                'opts' => [
                    ['l' => 'La carte mère directement', 'c' => false],
                    ['l' => 'La carte graphique (GPU)', 'c' => true],
                    ['l' => 'La RAM', 'c' => false],
                    ['l' => 'Le CPU uniquement', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce qu\'un registre dans un processeur ?',
                'opts' => [
                    ['l' => 'Un type de disque dur', 'c' => false],
                    ['l' => 'Une petite mémoire ultra-rapide interne au CPU', 'c' => true],
                    ['l' => 'Un connecteur de la carte mère', 'c' => false],
                    ['l' => 'Un logiciel de gestion des ressources', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel bus est utilisé pour connecter un SSD NVMe à la carte mère ?',
                'opts' => [
                    ['l' => 'Bus SATA', 'c' => false],
                    ['l' => 'Bus USB', 'c' => false],
                    ['l' => 'Bus PCIe', 'c' => true],
                    ['l' => 'Bus ISA', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel composant convertit le courant alternatif en courant continu ?',
                'opts' => [
                    ['l' => 'La carte mère', 'c' => false],
                    ['l' => 'L\'alimentation (PSU)', 'c' => true],
                    ['l' => 'Le chipset', 'c' => false],
                    ['l' => 'Le ventilateur', 'c' => false],
                ],
            ],
            [
                'q' => 'La RAM DDR5 est-elle compatible avec un slot DDR4 ?',
                'opts' => [
                    ['l' => 'Oui, elles sont rétrocompatibles', 'c' => false],
                    ['l' => 'Non, chaque génération DDR a son propre slot', 'c' => true],
                    ['l' => 'Oui si on utilise un adaptateur', 'c' => false],
                    ['l' => 'Cela dépend du fabricant', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que la fréquence de rafraîchissement d\'un écran ?',
                'opts' => [
                    ['l' => 'La résolution de l\'écran', 'c' => false],
                    ['l' => 'Le nombre d\'images affichées par seconde (Hz)', 'c' => true],
                    ['l' => 'La luminosité maximale', 'c' => false],
                    ['l' => 'La taille de la dalle', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel terme désigne la connexion d\'une carte graphique externe à un ordinateur portable ?',
                'opts' => [
                    ['l' => 'SLI', 'c' => false],
                    ['l' => 'eGPU (External GPU)', 'c' => true],
                    ['l' => 'iGPU', 'c' => false],
                    ['l' => 'Crossfire', 'c' => false],
                ],
            ],
            [
                'q' => 'Quelle est la hiérarchie correcte des mémoires, de la plus rapide à la plus lente ?',
                'opts' => [
                    ['l' => 'Disque dur → RAM → Cache → Registres', 'c' => false],
                    ['l' => 'RAM → Cache → Registres → Disque', 'c' => false],
                    ['l' => 'Registres → Cache → RAM → Disque', 'c' => true],
                    ['l' => 'Cache → Registres → RAM → Disque', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    private function qcmEvaluationFinale(Resource $r): void
    {
        $questions = [
            [
                'q' => 'Quel est le rôle du CPU dans un ordinateur ?',
                'exp' => 'Le CPU exécute les instructions des programmes et coordonne tous les autres composants.',
                'opts' => [
                    ['l' => 'Stocker les données de façon permanente', 'c' => false],
                    ['l' => 'Exécuter les instructions et coordonner les composants', 'c' => true],
                    ['l' => 'Afficher les images sur l\'écran', 'c' => false],
                    ['l' => 'Connecter les périphériques', 'c' => false],
                ],
            ],
            [
                'q' => 'Cite deux différences entre un HDD et un SSD.',
                'exp' => 'HDD : plateaux magnétiques mécaniques, plus lent, moins cher. SSD : mémoire flash, plus rapide, résistant aux chocs.',
                'opts' => [
                    ['l' => 'Le HDD est plus rapide et plus cher ; le SSD est lent et bon marché', 'c' => false],
                    ['l' => 'Le HDD utilise des plateaux magnétiques (lent) ; le SSD utilise de la flash (rapide, résistant)', 'c' => true],
                    ['l' => 'Il n\'y a aucune différence notable', 'c' => false],
                    ['l' => 'Le SSD est magnétique ; le HDD utilise de la flash', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel composant relie physiquement tous les composants d\'un PC ?',
                'exp' => 'La carte mère est le circuit principal qui interconnecte tous les composants.',
                'opts' => [
                    ['l' => 'La RAM', 'c' => false],
                    ['l' => 'La carte graphique', 'c' => false],
                    ['l' => 'La carte mère', 'c' => true],
                    ['l' => 'L\'alimentation (PSU)', 'c' => false],
                ],
            ],
            [
                'q' => 'Qu\'est-ce que la VRAM et à quel composant appartient-elle ?',
                'exp' => 'La VRAM est la mémoire vidéo dédiée de la carte graphique (GPU).',
                'opts' => [
                    ['l' => 'C\'est la RAM principale appartenant au CPU', 'c' => false],
                    ['l' => 'C\'est la mémoire vidéo dédiée appartenant à la carte graphique (GPU)', 'c' => true],
                    ['l' => 'C\'est une ROM pour la carte mère', 'c' => false],
                    ['l' => 'C\'est la mémoire cache du processeur', 'c' => false],
                ],
            ],
            [
                'q' => 'Explique le cycle Fetch-Decode-Execute en 3 étapes.',
                'exp' => '1. Fetch : récupérer l\'instruction en mémoire. 2. Decode : la décoder. 3. Execute : l\'exécuter.',
                'opts' => [
                    ['l' => '1. Stocker 2. Transférer 3. Afficher', 'c' => false],
                    ['l' => '1. Récupérer (Fetch) 2. Décoder (Decode) 3. Exécuter (Execute)', 'c' => true],
                    ['l' => '1. Lire le disque 2. Charger en RAM 3. Afficher', 'c' => false],
                    ['l' => '1. Allumer 2. POST 3. Démarrer le système', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel est l\'avantage d\'un processeur multi-cœurs ?',
                'exp' => 'Il peut exécuter plusieurs tâches en parallèle, améliorant les performances globales.',
                'opts' => [
                    ['l' => 'Il consomme moins d\'électricité', 'c' => false],
                    ['l' => 'Il peut exécuter plusieurs tâches simultanément en parallèle', 'c' => true],
                    ['l' => 'Il n\'a pas besoin de refroidissement', 'c' => false],
                    ['l' => 'Il est compatible avec plus de logiciels', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel type de bus connecte le CPU à la RAM ?',
                'exp' => 'Le bus mémoire (bus système ou FSB dans les anciens systèmes) relie le CPU à la RAM.',
                'opts' => [
                    ['l' => 'Bus PCIe', 'c' => false],
                    ['l' => 'Bus SATA', 'c' => false],
                    ['l' => 'Bus mémoire (DDR)', 'c' => true],
                    ['l' => 'Bus USB', 'c' => false],
                ],
            ],
            [
                'q' => 'Classe correctement : Clavier, Imprimante, Écran tactile.',
                'exp' => 'Clavier : entrée. Imprimante : sortie. Écran tactile : mixte (entrée/sortie).',
                'opts' => [
                    ['l' => 'Tous sont des périphériques d\'entrée', 'c' => false],
                    ['l' => 'Clavier=entrée, Imprimante=sortie, Écran tactile=mixte', 'c' => true],
                    ['l' => 'Clavier=sortie, Imprimante=entrée, Écran tactile=entrée', 'c' => false],
                    ['l' => 'Tous sont des périphériques de sortie', 'c' => false],
                ],
            ],
            [
                'q' => 'Quel est le rôle du BIOS/UEFI au démarrage ?',
                'exp' => 'Le BIOS/UEFI initialise le matériel, fait le POST, puis lance le bootloader du système d\'exploitation.',
                'opts' => [
                    ['l' => 'Charger directement les applications utilisateur', 'c' => false],
                    ['l' => 'Initialiser le matériel et lancer le bootloader du système d\'exploitation', 'c' => true],
                    ['l' => 'Gérer la mémoire virtuelle', 'c' => false],
                    ['l' => 'Afficher le bureau du système d\'exploitation', 'c' => false],
                ],
            ],
            [
                'q' => 'Pourquoi dit-on que le GPU est plus adapté au calcul parallèle que le CPU ?',
                'exp' => 'Le GPU possède des milliers de petits cœurs conçus pour traiter de nombreuses opérations simultanément.',
                'opts' => [
                    ['l' => 'Parce qu\'il a une fréquence plus élevée', 'c' => false],
                    ['l' => 'Parce qu\'il possède des milliers de petits cœurs pour le traitement parallèle', 'c' => true],
                    ['l' => 'Parce qu\'il est connecté directement à la RAM', 'c' => false],
                    ['l' => 'Parce qu\'il utilise le bus SATA', 'c' => false],
                ],
            ],
        ];
        $this->insertQcm($r, $questions);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════════════════

    private function makeChapter(Course $course, string $title, int $order): Chapter
    {
        return Chapter::create([
            'course_id' => $course->id,
            'title'     => $title,
            'order'     => $order,
        ]);
    }

    private function makeResource(Chapter $chapter, Course $course, array $data): Resource
    {
        return Resource::create([
            'course_id'    => $course->id,
            'chapter_id'   => $chapter->id,
            'type'         => $data['type'],
            'file_type'    => $data['file_type'],
            'title'        => $data['title'],
            'file_path'    => null,
            'file_name'    => null,
            'file_size'    => null,
            'external_url' => $data['external_url'] ?? null,
            'is_visible'   => true,
            'order'        => $data['order'],
        ]);
    }

    private function insertQcm(Resource $r, array $questions): void
    {
        foreach ($questions as $i => $q) {
            $question = QcmQuestion::create([
                'resource_id' => $r->id,
                'question'    => $q['q'],
                'order'       => $i,
                'points'      => 1,
                'explanation' => $q['exp'] ?? null,
            ]);
            foreach ($q['opts'] as $j => $opt) {
                QcmOption::create([
                    'question_id' => $question->id,
                    'label'       => $opt['l'],
                    'is_correct'  => $opt['c'],
                    'order'       => $j,
                ]);
            }
        }
    }

    private function exDragDrop(Resource $r, string $instructions, array $pairs): void
    {
        Exercise::create([
            'resource_id'  => $r->id,
            'title'        => $r->title,
            'instructions' => $instructions,
            'type'         => 'drag_drop',
            'content'      => ['pairs' => $pairs],
            'max_score'    => count($pairs),
            'auto_correct' => true,
            'deadline'     => null,
        ]);
    }

    private function exFillBlanks(Resource $r, string $template, bool $caseSensitive = false): void
    {
        // Count blanks [[...]]
        preg_match_all('/\[\[([^\]]+)\]\]/', $template, $matches);
        Exercise::create([
            'resource_id'  => $r->id,
            'title'        => $r->title,
            'instructions' => 'Complète le texte en remplissant les blancs.',
            'type'         => 'fill_blanks',
            'content'      => ['template' => $template, 'case_sensitive' => $caseSensitive],
            'max_score'    => count($matches[0]),
            'auto_correct' => true,
            'deadline'     => null,
        ]);
    }

    private function exOrdering(Resource $r, string $instructions, array $items): void
    {
        Exercise::create([
            'resource_id'  => $r->id,
            'title'        => $r->title,
            'instructions' => $instructions,
            'type'         => 'ordering',
            'content'      => ['items' => $items],
            'max_score'    => count($items),
            'auto_correct' => true,
            'deadline'     => null,
        ]);
    }

    private function exTruthTable(Resource $r, string $instructions, array $variables, array $outputLabels, array $rows): void
    {
        $maxScore = count($rows) * count($outputLabels);
        Exercise::create([
            'resource_id'  => $r->id,
            'title'        => $r->title,
            'instructions' => $instructions,
            'type'         => 'truth_table',
            'content'      => [
                'variables'     => $variables,
                'output_labels' => $outputLabels,
                'rows'          => $rows,
            ],
            'max_score'    => $maxScore,
            'auto_correct' => true,
            'deadline'     => null,
        ]);
    }
}
