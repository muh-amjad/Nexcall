namespace MeetUp.Api.Dtos
{
    public class UserDto
    {
        public string Username { get; set; }
        public string Id { get; set; }
        public bool IsInCall { get; set; }
        public string? RoomId { get; set; }

        public UserDto(string id, string username)
        {
            this.Username = username;
            this.Id = id;
            this.IsInCall = false;
            this.RoomId = null;
        }

        public UserDto(string id, string username, bool isInCall, string? roomId)
        {
            this.Username = username;
            this.Id = id;
            this.IsInCall = isInCall;
            this.RoomId = roomId;
        }
    }
}
