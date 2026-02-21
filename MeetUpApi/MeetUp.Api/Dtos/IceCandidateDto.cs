namespace MeetUp.Api.Dtos
{
    public class IceCandidateDto
    {
        public string Candidate { get; set; }       // candidate string
        public string SdpMid { get; set; }          // media stream id
        public int? SdpMLineIndex { get; set; }     // media line index
    }
}
