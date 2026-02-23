namespace MeetUp.Api.Dtos
{
    public class UserDto
    {
        public string Username { get; set; }
        public Guid Id { get; set; }

        public UserDto(string username, Guid id)
        {
            this.Username = username;
            this.Id = id;
        }
    }
}
