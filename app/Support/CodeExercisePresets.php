<?php

namespace App\Support;

class CodeExercisePresets
{
    public static function all(): array
    {
        return [
            [
                'id' => 'html-profile-card',
                'language' => 'html',
                'title' => 'Carte de profil HTML',
                'summary' => 'Balises semantiques, image, lien et structure de base.',
                'instructions' => "Creer une carte de profil en HTML. La page doit contenir un article avec la classe card, un titre h2, une image et un lien vers un portfolio.",
                'starter_code' => "<article class=\"card\">\n  <!-- Completez la carte -->\n</article>\n",
                'expected_output' => "Une carte HTML contenant un titre, une image et un lien.",
                'tests' => [
                    ['label' => 'Utilise une balise article', 'type' => 'html_tag', 'value' => 'article', 'points' => 2],
                    ['label' => 'Ajoute la classe card', 'type' => 'contains', 'value' => 'class="card"', 'points' => 1],
                    ['label' => 'Ajoute un titre h2', 'type' => 'html_tag', 'value' => 'h2', 'points' => 1],
                    ['label' => 'Ajoute une image avec alt', 'type' => 'html_attribute', 'value' => 'img', 'property' => 'alt', 'points' => 2],
                    ['label' => 'Ajoute un lien', 'type' => 'html_tag', 'value' => 'a', 'points' => 1],
                ],
            ],
            [
                'id' => 'css-flex-card',
                'language' => 'css',
                'title' => 'Mise en page CSS avec Flexbox',
                'summary' => 'Selecteurs, flexbox, espacement et style de carte.',
                'instructions' => "Styliser une carte avec CSS. La classe .card doit utiliser flexbox, avoir un espacement interne et des coins arrondis.",
                'starter_code' => ".card {\n  /* Completez le style */\n}\n\n.card img {\n  max-width: 100%;\n}\n",
                'expected_output' => "Une carte lisible, alignee avec flexbox.",
                'tests' => [
                    ['label' => 'Selectionne .card', 'type' => 'css_selector', 'value' => '.card', 'points' => 1],
                    ['label' => 'Utilise display flex', 'type' => 'css_property', 'value' => '.card', 'property' => 'display', 'expected' => 'flex', 'points' => 2],
                    ['label' => 'Ajoute du padding', 'type' => 'css_property', 'value' => '.card', 'property' => 'padding', 'points' => 1],
                    ['label' => 'Ajoute un border-radius', 'type' => 'css_property', 'value' => '.card', 'property' => 'border-radius', 'points' => 1],
                ],
            ],
            [
                'id' => 'js-array-total',
                'language' => 'javascript',
                'title' => 'Somme des nombres en JavaScript',
                'summary' => 'Fonction, boucle ou reduce, retour de valeur.',
                'instructions' => "Ecrire une fonction totalNotes(notes) qui recoit un tableau de nombres et retourne la somme.",
                'starter_code' => "function totalNotes(notes) {\n  // TODO: retourner la somme des notes\n}\n",
                'expected_output' => "totalNotes([10, 12, 8]) retourne 30",
                'tests' => [
                    ['label' => 'Declare la fonction totalNotes', 'type' => 'js_function', 'value' => 'totalNotes', 'points' => 2],
                    ['label' => 'Retourne une valeur', 'type' => 'contains', 'value' => 'return', 'points' => 1],
                    ['label' => 'Parcourt ou reduit le tableau', 'type' => 'regex', 'pattern' => '(for|forEach|reduce)', 'points' => 2],
                    ['label' => 'Supprime le TODO', 'type' => 'not_contains', 'value' => 'TODO', 'points' => 1],
                ],
            ],
            [
                'id' => 'php-average',
                'language' => 'php',
                'title' => 'Moyenne en PHP',
                'summary' => 'Fonction PHP, tableau, somme et division.',
                'instructions' => 'Ecrire une fonction moyenne($notes) qui retourne la moyenne des valeurs d\'un tableau.',
                'starter_code' => "<?php\n\nfunction moyenne(array \$notes) {\n    // TODO: retourner la moyenne\n}\n",
                'expected_output' => "moyenne([10, 12, 14]) retourne 12",
                'tests' => [
                    ['label' => 'Declare la fonction moyenne', 'type' => 'contains', 'value' => 'function moyenne', 'points' => 2],
                    ['label' => 'Utilise array_sum', 'type' => 'contains', 'value' => 'array_sum', 'points' => 1],
                    ['label' => 'Compte les elements', 'type' => 'contains', 'value' => 'count', 'points' => 1],
                    ['label' => 'Retourne le resultat', 'type' => 'contains', 'value' => 'return', 'points' => 1],
                ],
            ],
            [
                'id' => 'sql-active-students',
                'language' => 'sql',
                'title' => 'Requete SQL avec filtre',
                'summary' => 'SELECT, WHERE, ORDER BY sur une table students.',
                'instructions' => "Ecrire une requete qui selectionne les noms et emails des etudiants actifs depuis la table students, tries par nom.",
                'starter_code' => "-- Table: students(id, name, email, is_active)\nSELECT\n  -- Completez la requete\n",
                'expected_output' => "Colonnes attendues: name, email. Filtre: is_active = 1. Tri: name.",
                'tests' => [
                    ['label' => 'Utilise SELECT', 'type' => 'sql_clause', 'value' => 'SELECT', 'points' => 1],
                    ['label' => 'Interroge la table students', 'type' => 'sql_table', 'value' => 'students', 'points' => 1],
                    ['label' => 'Selectionne name', 'type' => 'sql_column', 'value' => 'name', 'points' => 1],
                    ['label' => 'Selectionne email', 'type' => 'sql_column', 'value' => 'email', 'points' => 1],
                    ['label' => 'Filtre avec WHERE', 'type' => 'sql_clause', 'value' => 'WHERE', 'points' => 1],
                    ['label' => 'Trie avec ORDER BY', 'type' => 'sql_clause', 'value' => 'ORDER BY', 'points' => 1],
                ],
            ],
        ];
    }
}
