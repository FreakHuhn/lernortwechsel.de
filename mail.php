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
    $nachtricht = isset($_POST['nachtricht']) ? trim($_POST['nachtricht']) : '';

    if (empty($name) || empty($topic) || empty($nachtricht)) {
        echo 'Bitte füllen Sie alle Felder aus.';
        exit;
    }

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = 'mail.lernortwechsel.de';
        $mail->SMTPAuth = true;
        $mail->Username = 'webform@lernortwechsel.de';
        $mail->Password = 'abcd1234';
        $mail->SMTPSecure = 'tls';
        $mail->Port = 587;

        $mail->CharSet = 'UTF-8';

        $mail->setFrom('webform@lernortwechsel.de', $name);

        $mail->addAddress('kontakt@lernortwechsel.de');

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
        $mail->AltBody = strip_tags($mail->Body);

        $mail->send();
        echo 'Ihre Nachricht wurde erfolgreich gesendet. Vielen Dank!';
        
    } catch (Exception $e) {
        echo 'Es ist ein Fehler aufgetreten: ' . $mail->ErrorInfo;
    }
} else {
    echo 'Zugriff nicht gestattet';
}
?>