namespace MeetUp.Api.Dtos
{
    public class CallOfferDto
    {
        public string From { get; set; }
        public string To { get; set; }
        public object Offer { get; set; }

        public CallOfferDto() {
        }

        public override string ToString()
        {
            return $"{From} - {To} - {Offer ?? "NULL"}";
        }


    }
}
