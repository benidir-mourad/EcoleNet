<?php

namespace Tests\Feature;

use App\Notifications\ResetPasswordNotification;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

/**
 * Ce parcours n'avait aucun test alors qu'il permet de reprendre la main sur un
 * compte : validité du jeton, expiration, rejeu, et fermeture des sessions.
 */
class PasswordResetTest extends TestCase
{
    use CreatesTestData;
    use RefreshDatabase;

    public function test_requesting_a_link_sends_the_notification(): void
    {
        Notification::fake();
        $user = $this->user('student', 'active', ['email' => 'eleve@example.com']);

        $this->postJson('/api/forgot-password', ['email' => 'eleve@example.com'])->assertOk();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_no_notification_is_sent_for_an_unknown_address(): void
    {
        Notification::fake();

        // La réponse reste identique — voir AuthApiTest — mais rien ne part.
        $this->postJson('/api/forgot-password', ['email' => 'inconnu@example.com'])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_a_valid_token_resets_the_password(): void
    {
        $user = $this->user('student', 'active', ['email' => 'eleve@example.com']);
        $token = Password::createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'eleve@example.com',
            'password' => 'nouveau-mot-de-passe',
            'password_confirmation' => 'nouveau-mot-de-passe',
        ])->assertOk();

        $this->assertTrue(Hash::check('nouveau-mot-de-passe', $user->fresh()->password));
    }

    public function test_a_token_cannot_be_replayed(): void
    {
        $user = $this->user('student', 'active', ['email' => 'eleve@example.com']);
        $token = Password::createToken($user);

        $payload = [
            'token' => $token,
            'email' => 'eleve@example.com',
            'password' => 'premier-mot-de-passe',
            'password_confirmation' => 'premier-mot-de-passe',
        ];

        $this->postJson('/api/reset-password', $payload)->assertOk();
        $this->postJson('/api/reset-password', $payload)->assertStatus(422);
    }

    public function test_a_token_of_another_account_is_refused(): void
    {
        $victim = $this->user('student', 'active', ['email' => 'victime@example.com']);
        $attacker = $this->user('student', 'active', ['email' => 'attaquant@example.com']);
        $originalPassword = $victim->password;

        $this->postJson('/api/reset-password', [
            'token' => Password::createToken($attacker),
            'email' => 'victime@example.com',
            'password' => 'detourne',
            'password_confirmation' => 'detourne',
        ])->assertStatus(422);

        $this->assertSame($originalPassword, $victim->fresh()->password);
    }

    public function test_an_invalid_token_is_refused(): void
    {
        $this->user('student', 'active', ['email' => 'eleve@example.com']);

        $this->postJson('/api/reset-password', [
            'token' => 'jeton-invente',
            'email' => 'eleve@example.com',
            'password' => 'nouveau-mot-de-passe',
            'password_confirmation' => 'nouveau-mot-de-passe',
        ])->assertStatus(422);
    }

    public function test_resetting_closes_every_open_session(): void
    {
        $user = $this->user('student', 'active', ['email' => 'eleve@example.com']);
        $token = $user->createToken('appareil')->plainTextToken;

        $this->postJson('/api/reset-password', [
            'token' => Password::createToken($user),
            'email' => 'eleve@example.com',
            'password' => 'nouveau-mot-de-passe',
            'password_confirmation' => 'nouveau-mot-de-passe',
        ])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me')
            ->assertUnauthorized();
    }

    public function test_a_short_password_is_refused(): void
    {
        $user = $this->user('student', 'active', ['email' => 'eleve@example.com']);

        $this->postJson('/api/reset-password', [
            'token' => Password::createToken($user),
            'email' => 'eleve@example.com',
            'password' => 'court',
            'password_confirmation' => 'court',
        ])->assertStatus(422);
    }
}
