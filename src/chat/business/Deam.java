package chat.business;

import org.springframework.lang.NonNull;

public record Deam(@NonNull String message) implements Comparable<Deam> {
    @Override
    public String toString() {
        return "Message: " + message;
    }

    @Override
    public int compareTo(Deam deam) {
        return message.compareTo(deam.message);
    }
}