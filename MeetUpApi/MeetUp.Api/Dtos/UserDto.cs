namespace MeetUp.Api.Dtos
{
    public class UserDto
    {
        public string Username { get; set; }
        public string Id { get; set; }

        public UserDto(string id, string username)
        {
            this.Username = username;
            this.Id = id;
        }
    }
}
