namespace MeetUp.Api.Dtos
{
    public class SessionDescriptionDto
    {
        public string Type { get; set; }     // "offer" or "answer"
        public string Sdp { get; set; }      // SDP string from browser
    }
}
