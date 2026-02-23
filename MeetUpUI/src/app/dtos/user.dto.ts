export class UserDto{
    username!: string;
    id!: string;

    constructor(username: string, id:string){
        this.username = username;
        this.id = id;
    }
}