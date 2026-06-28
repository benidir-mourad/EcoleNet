<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(private string $url) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Réinitialisation de votre mot de passe — EcoleNet')
            ->greeting('Bonjour ' . $notifiable->first_name . ',')
            ->line('Vous recevez cet email car une demande de réinitialisation de mot de passe a été soumise pour votre compte.')
            ->action('Réinitialiser mon mot de passe', $this->url)
            ->line('Ce lien expirera dans **60 minutes**.')
            ->line('Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe restera inchangé.')
            ->salutation('Cordialement, L\'équipe EcoleNet');
    }
}
