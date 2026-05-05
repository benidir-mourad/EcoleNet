<?php

namespace Database\Seeders;

use App\Models\SchoolClass;
use App\Models\Section;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'first_name' => 'Prof',
            'last_name'  => 'Dupont',
            'email'      => 'teacher@ecolenet.be',
            'password'   => Hash::make('password'),
            'role'       => 'teacher',
            'status'     => 'active',
        ]);

        User::create([
            'first_name' => 'Admin',
            'last_name'  => 'EcoleNet',
            'email'      => 'admin@ecolenet.be',
            'password'   => Hash::make('password'),
            'role'       => 'admin',
            'status'     => 'active',
        ]);

        $classNames = [
            '3e technique de transition informatique',
            '4e technique de transition informatique',
            '5e technique de transition informatique',
            '6e technique de transition informatique',
        ];
        $sectionNames = ['Informatique', 'TPT', 'Laboratoire informatique', 'Laboratoire de logique'];

        $this->call(ComposantsOrdinateurSeeder::class);
        $this->call(ComposantsOrdinateurFilesSeeder::class);

        foreach ($classNames as $name) {
            $class = SchoolClass::create([
                'name'      => $name,
                'slug'      => Str::slug($name),
                'year'      => '2025-2026',
                'is_active' => true,
            ]);
            foreach ($sectionNames as $order => $sName) {
                Section::create([
                    'class_id'  => $class->id,
                    'name'      => $sName,
                    'slug'      => Str::slug($sName . '-' . $class->id),
                    'order'     => $order,
                    'is_active' => true,
                ]);
            }
        }
    }
}
