package chat.business;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public record GodDeam(String sender, String message, String date) {
    public GodDeam(String sender, String message) {
        this(sender, message, LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("hh:mm a | MMM dd")));
    }

    @Override
    public String toString() {
        return String.format("GodDeam{ Sender: %s, Message: %s, Date: %s }", sender, message, date);
    }
}
