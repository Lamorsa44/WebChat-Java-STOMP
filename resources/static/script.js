const sendButton = document.getElementById("send-msg-btn");
const msgContainer = document.getElementById("input-msg");
const messagesBox = document.getElementById("messages");
const usernameInput = document.getElementById("input-username");
const usernameButton = document.getElementById("send-username-btn");
const usersContainer = document.getElementById("users");
const chatWith = document.getElementById("chat-with");
const publicChatBtn = document.getElementById("public-chat-btn");

const userObjects = new Map();

let stompClient = null;
let thisUser = null;
connected();

// Login
usernameButton.addEventListener("click", logIn)
usernameInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        logIn();
    }
})

function loginToChat() {
    const loginElements = [usernameInput, usernameButton];
    const chatElements = [chatWith, usersContainer, messagesBox, msgContainer, sendButton, document.getElementById("sent-container")]

    loginElements.forEach(e => e.classList.add("hidden"));
    chatElements.forEach(e => e.classList.remove("hidden"));
}

function logIn() {
    if (usernameInput.value === "Public chat") {
        alert("'Public chat' is a reserved name. Please choose another username.");
        return;
    }

    fetch("/api/checkUsername", {
        method: "POST",
        headers: {"Content-Type": "application/json",},
        body: JSON.stringify({message: usernameInput.value}),
        })
        .then(response => {
            if (response.ok) {
                thisUser = usernameInput.value;
                sendInputAndClean("/app/login", usernameInput);
                loginToChat();
            } else {
                alert("Try other username");
            }
        });
}

// Switching chats
publicChatBtn.addEventListener("click", () => {
    clearMessages();
    chatWith.textContent = 'Public chat';
    fetch("/api/getMessages").then(listOfMessages => {
        console.log("Getting messages");
        listOfMessages.json().then(messages => {
            messages.forEach(message => {new MessageContainer(message).display()});
        });
    });
})

// Messages
sendButton.addEventListener("click", sendMessage);
msgContainer.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        sendMessage();
    }
})

function sendMessage() {
    if (chatWith.textContent === "Public chat") {
        sendInputAndClean("/app/send", msgContainer);
    } else {
        sendPrivateInputAndClean("/app/sendPrivate", msgContainer);
    }
}

// connected();

function connected() {
    stompClient = new StompJs.Client({
        webSocketFactory: () => new SockJS("http://localhost:28852/chat")
    });

    stompClient.onConnect = (frame) => {
        console.log("Connected: " + frame);

        fetch("/api/getMessages").then(listOfMessages => {
            console.log("Getting messages");
            listOfMessages.json().then(messages => {
                messages.forEach(message => {new MessageContainer(message).display()});
            });
        });

        fetch("/api/getUsers").then(listOfUsers => {
            console.log("Getting users");
            listOfUsers.json().then(users => {
                if (users.length !== 0) {
                    users.map(user => new User(user)).forEach(user => user.display());
                }
            });
        });

        stompClient.subscribe("/topics/update", (message) => {
            if (chatWith.textContent !== "Public chat") {
                return;
            }

            displayMessages(message);
        });

        stompClient.subscribe("/user/queues/private", (message) => {
            if (chatWith.textContent === "Public chat") {
                const godDamn = JSON.parse(message.body);
                if (godDamn.sender !== chatWith.textContent) {
                    console.log("Not same user")
                    addUserNotification(godDamn);
                }
                return;
            }

            displayMessages(message);
        });

        stompClient.subscribe("/topics/users/add", (deam) => {
            const user = new User(JSON.parse(deam.body));
            if (user.username !== thisUser) {
                console.log(`ADD USER: ${deam}`);
                user.display();
            }
        });

        stompClient.subscribe("/topics/users/remove", (deam) => {
            const user = userObjects.get(JSON.parse(deam.body).message);
            console.log(`REMOVE USER: ${deam}`)
            user.remove();
        });
    };

    stompClient.onDisconnect = (frame) => {};

    stompClient.onStompError = (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
    };

    stompClient.activate();
}
// Private messages
function getPrivateChat() {
    const value = [{message: thisUser}, {message: chatWith.textContent}];
    fetch("/api/chats", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(value),
    }).then(response => {
        if (response.ok) {
            console.log("Getting private messages");
            response.json().then(messages => {
                if (messages) {
                    messages.forEach(message => new MessageContainer(message).display());
                }
            });
        } else {
            console.log("Error in private messages");
        }
    }).catch(reason => {
        console.log(reason);
    })
}

//util
function MessageContainer(godDeam) {
    this.sender = godDeam.sender;
    this.date = godDeam.date;
    this.message = godDeam.message;
    this.display = () => {
        let messageCont = document.createElement("div");
        let messageSender = document.createElement("div");
        let messageDateTimeCont = document.createElement("div");
        let messageDataCont = document.createElement("div");

        messageCont.classList.add("message-container");
        messageSender.classList.add("sender");
        messageDateTimeCont.classList.add("date");
        messageDataCont.classList.add("message");

        messageSender.textContent = this.sender;
        messageDateTimeCont.textContent = this.date;
        messageDataCont.textContent = this.message;

        const meta = document.createElement("div");
        meta.setAttribute("id", "meta")
        meta.append(messageSender, messageDateTimeCont);

        messageCont.append(meta, messageDataCont);

        messagesBox.append(messageCont);
        messageCont.scrollIntoView({behavior: "smooth"});
    }
}

function User(deam) {
    this.username = deam.message;
    this.container = null;
    this.div = null;
    this.notiDiv = null;
    userObjects.set(this.username, this);
    this.notification = {
        count: 0,
        incrementCount: () => {
            this.notification.count++;
            this.notiDiv.classList.remove("hidden");
            this.notiDiv.textContent = this.notification.count;
        },
        clearNotifications: () => {
            this.notiDiv.classList.add("hidden");
            this.notification.count = 0;
        },

    };
    this.display = () => {
        const container = document.createElement("div");
        const div = document.createElement("div");
        const notidiv = document.createElement("div");

        this.div = div;
        container.classList.add("user-container");

        div.classList.add("user")
        div.textContent = this.username;
        div.addEventListener("click", () => {
            clearMessages();
            chatWith.textContent = this.username;
            getPrivateChat();
            this.notification.clearNotifications();
        })

        notidiv.classList.add("new-message-counter", "hidden");
        notidiv.addEventListener("click", () => {
            clearMessages();
            chatWith.textContent = this.username;
            getPrivateChat();
            this.notification.clearNotifications();
        })
        this.notiDiv = notidiv;
        this.container = container;

        container.append(div, notidiv);
        usersContainer.append(container);
    };
    this.remove = () => {
        if (this.container) {
            this.container.remove();
        }
    };
}

function clearMessages() {
    messagesBox.replaceChildren(chatWith);
}

function displayMessages(message) {
    const messageData = JSON.parse(message.body);
    console.log(`JSON: ${message.body}`);

    const messageContainer = new MessageContainer(messageData);
    console.log(`Object: ${messageContainer}`);

    messageContainer.display();
}

function sendInputAndClean(url, container) {
    if (container.value.trim().length !== 0) {
        if (stompClient && stompClient.connected) {
            stompClient.publish({
                destination: url,
                body: JSON.stringify({"message": container.value})
            });
        }
        container.value = "";
    }
}

function sendPrivateInputAndClean(url, container) {
    if (container.value.trim().length !== 0) {
        if (stompClient && stompClient.connected) {
            stompClient.publish({
                destination: url,
                headers: {
                    "user": thisUser,
                    "other-user": chatWith.textContent
                },
                body: JSON.stringify({"message": container.value})
            });
        }
        const user = userObjects.get(chatWith.textContent);
        if (user) {
            usersContainer.prepend(user.container);
        }
        container.value = "";
    }
}

function addUserNotification(godDamn) {
    const user = userObjects.get(godDamn.sender);
    if (user) {
        user.notification.incrementCount();
        usersContainer.prepend(user.container);
    }
}