package chat.business;

import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;

public class Chat {
    private Set<Deam> users;
    private List<GodDeam> messages;

    public Chat(Deam user1, Deam user2) {
        users = (Set.of(user1, user2));
        messages = new CopyOnWriteArrayList<GodDeam>();
    }

    public Chat(Set<Deam> users) {
        this.users = users;
        messages = new CopyOnWriteArrayList<>();
    }

    public boolean exists(Deam user1, Deam user2) {
        return users.containsAll(Set.of(user1, user2));
    }

    synchronized public void addMessage(GodDeam message) {
        messages.add(message);
    }

    public List<GodDeam> getMessages() {
        return List.copyOf(messages);
    }

    public Set<Deam> getUsers() {
        return users;
    }

    @Override
    public boolean equals(Object obj) {
        return obj instanceof Set<?> && obj.equals(users);
    }

    @Override
    public String toString() {
        return "Chat{" +
                "users=" + users +
                ", messages=" + messages +
                '}';
    }
}
