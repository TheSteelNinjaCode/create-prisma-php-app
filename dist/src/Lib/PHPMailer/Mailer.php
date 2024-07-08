<?php

namespace Lib\PHPMailer;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Lib\Validator;

class Mailer
{
    private PHPMailer $mail;

    public function __construct()
    {
        $this->mail = new PHPMailer(true);
        $this->setup();
    }

    private function setup(): void
    {
        $this->mail->isSMTP();
        $this->mail->SMTPDebug = 0;
        $this->mail->Host = $_ENV['SMTP_HOST'];
        $this->mail->SMTPAuth = true;
        $this->mail->Username = $_ENV['SMTP_USERNAME'];
        $this->mail->Password = $_ENV['SMTP_PASSWORD'];
        $this->mail->SMTPSecure = $_ENV['SMTP_ENCRYPTION'];
        $this->mail->Port = (int) $_ENV['SMTP_PORT'];
        $this->mail->setFrom($_ENV['MAIL_FROM'], $_ENV['MAIL_FROM_NAME']);
    }

    /**
     * Send an email.
     *
     * @param string $to The recipient's email address.
     * @param string $subject The subject of the email.
     * @param string $body The HTML body of the email.
     * @param string $name (optional) The name of the recipient.
     * @param string $altBody (optional) The plain text alternative body of the email.
     * @param string|array $addCC (optional) Additional email addresses to send a carbon copy (CC) to.
     * @param string|array $addBCC (optional) Additional email addresses to send a blind carbon copy (BCC) to.
     *
     * @return bool Returns true if the email is sent successfully, false otherwise.
     *
     * @throws Exception Throws an exception if the email could not be sent.
     *
     * @example
     * $mailer = new Mailer();
     * $to = 'recipient@example.com';
     * $subject = 'Hello';
     * $body = '<h1>Example Email</h1><p>This is the HTML body of the email.</p>';
     * $name = 'John Doe';
     * $altBody = 'This is the plain text alternative body of the email.';
     * $addCC = ['cc1@example.com', 'cc2@example.com'];
     * $addBCC = 'bcc@example.com';
     *
     * try {
     *     $result = $mailer->send($to, $subject, $body, $name, $altBody, $addCC, $addBCC);
     *     if ($result) {
     *         echo 'Email sent successfully.';
     *     } else {
     *         echo 'Failed to send email.';
     *     }
     * } catch (Exception $e) {
     *     echo 'An error occurred: ' . $e->getMessage();
     * }
     */
    public function send(
        string $to,
        string $subject,
        string $body,
        string $name = '',
        string $altBody = '',
        string|array $addCC = [],
        string|array $addBCC = []
    ): bool {
        try {
            // Validate the main recipient email
            $to = Validator::email($to);
            if (!$to) {
                throw new \Exception('Invalid email address for the main recipient');
            }

            // Validate and sanitize other inputs
            $subject = Validator::string($subject);
            $body = Validator::string($body);
            $name = Validator::string($name);
            $altBody = Validator::string($altBody);

            // Handle CC recipients
            if (!empty($addCC)) {
                if (is_array($addCC)) {
                    foreach ($addCC as $cc) {
                        $cc = Validator::email($cc);
                        if ($cc) {
                            $this->mail->addCC($cc);
                        } else {
                            throw new \Exception('Invalid email address in CC');
                        }
                    }
                } else {
                    $cc = Validator::email($addCC);
                    if ($cc) {
                        $this->mail->addCC($cc);
                    } else {
                        throw new \Exception('Invalid email address in CC');
                    }
                }
            }

            // Handle BCC recipients
            if (!empty($addBCC)) {
                if (is_array($addBCC)) {
                    foreach ($addBCC as $bcc) {
                        $bcc = Validator::email($bcc);
                        if ($bcc) {
                            $this->mail->addBCC($bcc);
                        } else {
                            throw new \Exception('Invalid email address in BCC');
                        }
                    }
                } else {
                    $bcc = Validator::email($addBCC);
                    if ($bcc) {
                        $this->mail->addBCC($bcc);
                    } else {
                        throw new \Exception('Invalid email address in BCC');
                    }
                }
            }

            // Set the main recipient and other email properties
            $this->mail->addAddress($to, $name);
            $this->mail->isHTML(true);
            $this->mail->Subject = $subject;
            $this->mail->Body = $body;
            $this->mail->AltBody = $altBody;

            // Send the email
            return $this->mail->send();
        } catch (\Exception $e) {
            throw new \Exception($e->getMessage());
        }
    }
}
