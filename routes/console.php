<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Les jetons expirés restent en base tant qu'on ne les purge pas : sans cela la
// table grossit indéfiniment et garde la trace de sessions closes.
Schedule::command('sanctum:prune-expired --hours=24')->daily();
