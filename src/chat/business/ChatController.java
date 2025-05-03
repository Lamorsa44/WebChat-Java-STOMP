package chat.business;

import org.springframework.context.event.EventListener;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CopyOnWriteArraySet;

@Controller
public class ChatController {
    private final SimpMessagingTemplate brokerMessagingTemplate;
    private final Map<Principal, Deam> users = new ConcurrentHashMap<>();
    private final List<GodDeam> messages = new CopyOnWriteArrayList<>();
    private final Set<Chat> usersChats = new CopyOnWriteArraySet<>();

    public ChatController(SimpMessagingTemplate brokerMessagingTemplate) {
        this.brokerMessagingTemplate = brokerMessagingTemplate;
    }

    //    YEA
    @PostMapping("/api/checkUsername")
    public ResponseEntity<Void> checkUsername(@RequestBody Deam username) {
        if (users.containsValue(username)) {
            return ResponseEntity.badRequest().build();
        } else {
            return ResponseEntity.ok().build();
        }
    }

    @PostMapping("/api/chats")
    @ResponseBody
    public List<GodDeam> getChats(@RequestBody Set<Deam> users) {
        System.out.printf("Users: %s\n", users);
        if (usersChats.stream().anyMatch(chat -> chat.getUsers().containsAll(users))) {
            System.out.println("Chats getChats()");
            return usersChats.stream().filter(chat -> chat.getUsers().containsAll(users))
                    .findAny().get().getMessages();
        } else {
            System.out.println("No chats getChats()");
            usersChats.add(new Chat(users));
            return Collections.emptyList();
        }
    }

    @GetMapping("/api/getMessages")
    @ResponseBody
    public List<GodDeam> getMessages() {
        return messages;
    }

    @GetMapping("/api/getUsers")
    @ResponseBody
    public List<Deam> getUsers() {
        return List.copyOf(users.values().stream().sorted().toList());
    }

    //    WebSocket
    @MessageMapping("/send")
    @SendTo("/topics/update")
    public GodDeam sendMessages(@Payload Deam message, SimpMessageHeaderAccessor headerAccessor) {
        System.out.println("MESSAGE: " + message);
        GodDeam godDeam = new GodDeam(getUser(headerAccessor), message.message());
        messages.add(godDeam);
        return godDeam;
    }

    @MessageMapping("/login")
    public void login(@Payload Deam username, SimpMessageHeaderAccessor headerAccessor) {
        users.put(headerAccessor.getUser(), username);
        headerAccessor.getSessionAttributes().put("username", username.message());
        brokerMessagingTemplate.convertAndSend("/topics/users/add", username);
        System.out.println("LOGIN: " + username.message());
    }

    @MessageMapping("/sendPrivate")
    @SendToUser("/queues/private")
    public GodDeam sendPrivateMessage(@Payload Deam message,
                                      @Header("user") String user,
                                      @Header("other-user") String otherUser) {
        GodDeam godDeam = new GodDeam(user, message.message());
        Deam deamUser = new Deam(user), deamOtherUser = new Deam(otherUser);
//        add message
        Set<Deam> deamUsers = Set.of(deamUser, deamOtherUser);
        Chat chat1 = usersChats.stream()
                .filter(chat -> chat.getUsers().containsAll(deamUsers)).findAny().get();
        chat1.addMessage(godDeam);

        Principal deamPrincipal = users.entrySet().stream()
                .filter(entry -> entry.getValue().equals(deamOtherUser)).findAny().get().getKey();
        System.out.println(deamPrincipal.getName());
        brokerMessagingTemplate.convertAndSendToUser(deamPrincipal.getName(), "/queues/private", godDeam);
        return godDeam;
    }

    //    Events
    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = getUser(accessor);

        if (username != null) {
            Deam deam = new Deam(username);
            if (users.remove(event.getUser(), deam)) {
                System.out.println("USER REMOVED: " + username);
            } else {
                System.out.println("USER NOT REMOVED: " + username);
            }
            brokerMessagingTemplate.convertAndSend("/topics/users/remove", deam);
        }
    }

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        System.out.println("CONNECT: " + accessor);
    }

    private <T> String getUser(T headerAccessor) {
        return switch (headerAccessor) {
            case StompHeaderAccessor headerAccessor1 -> (String) headerAccessor1.getSessionAttributes().get("username");
            case SimpMessageHeaderAccessor headerAccessor2 ->
                    (String) headerAccessor2.getSessionAttributes().get("username");
            default -> throw new IllegalStateException("Unexpected value: " + headerAccessor);
        };
    }
}
