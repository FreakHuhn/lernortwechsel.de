<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'src/PHPMailer.php';
require 'src/SMTP.php';
require 'src/Exception.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = 'w01f1b52.kasserver.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'kontakt@lernortwechsel.net';
        $mail->Password = 'abc123!'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->CharSet = 'UTF-8';

        $mail->setFrom('kontakt@lernortwechsel.net', 'Webformular');
        $mail->addAddress('kontakt@lernortwechsel.net');
        $mail->addReplyTo($_POST['email']);

        $mail->isHTML(true);
        $mail->Subject = "Kontakt: " . $_POST['topic'];
        $mail->Body = "Name: " . $_POST['name'] . "<br>Nachricht: " . $_POST['nachricht'];

        $mail->send();
    } catch (Exception $e) {
        // Fehler wird im unsichtbaren Frame ignoriert
    }
}
exit; // WICHTIG
?>