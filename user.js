function User(id, name) {
    this.id = id;
    this.name = name;
    this.getName=function(){
        return this.name
    }
    this.getId=function(){
        return this.id
    }
}

module.exports = User;
