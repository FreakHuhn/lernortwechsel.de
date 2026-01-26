<?php

require 'src/PHPMailer.php';
require 'src/SMTP.php';
require 'src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $topic = isset($_POST['topic']) ? trim($_POST['topic']) : '';
    $nachricht = isset($_POST['nachricht']) ? trim($_POST['nachricht']) : '';

    // OPTIONAL: Email als Pflichtfeld (empfohlen, wenn dein HTML "required" hat)
    if (empty($name) || empty($email) || empty($topic) || empty($nachricht)) {
        echo 'Bitte füllen Sie alle Felder aus.';
        exit;
    }

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = '127.0.0.1';
        $mail->SMTPAuth = true;
        $mail->Username = 'kontakt@lernortwechsel.de';
        $mail->Password = 'abc123';
        $mail->SMTPSecure = PHPMAILER::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        $mail->CharSet = 'UTF-8';
	$mail->SMTPOptions = array(
		'ssl' => array(
			'verify_peer' => false,
			'verify_peer_name' => false,
			'allow_self_signed' => true
		)
	);

        // WICHTIG: Absender sollte zur SMTP-Anmeldung passen (sonst wird oft geblockt)
        $mail->setFrom('kontakt@lernortwechsel.de', 'Webformular');

        // Empfänger
        $mail->addAddress('kontakt@lernortwechsel.de');

        // Antworten gehen an den Nutzer (Reply-To)
        if (!empty($email)) {
            $mail->addReplyTo($email, $name);
        }

        $mail->isHTML(true);
        $mail->Subject = $topic;

        $mail->Body = '<h2>Neue Nachricht aus dem Web</h2>
                       <p><strong>Name:</strong> ' . htmlspecialchars($name) . '</p>
                       <p><strong>E-Mail:</strong> ' . htmlspecialchars($email) . '</p>
                       <p><strong>Thema:</strong> ' . htmlspecialchars($topic) . '</p>
                       <p><strong>Nachricht:</strong><br>' . nl2br(htmlspecialchars($nachricht)) . '</p>';

        $mail->AltBody =
            "Neue Nachricht aus dem Web\n\n" .
            "Name: " . $name . "\n" .
            "E-Mail: " . $email . "\n" .
            "Thema: " . $topic . "\n\n" .
            "Nachricht:\n" . $nachricht;

        $mail->send();
        echo 'Ihre Nachricht wurde erfolgreich gesendet. Vielen Dank!';

    } catch (Exception $e) {
        echo 'Es ist ein Fehler aufgetreten: ' . $mail->ErrorInfo;
    }
} else {
    echo 'Zugriff nicht gestattet';
}
?>
