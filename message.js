function MsgOnClient(time, content, User) {
    this.time = time;
    this.content = content;
    this.User = User;
}

module.exports = MsgOnClient;