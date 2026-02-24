using MeetUp.Api.Dtos;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace MeetUp.Api.Hubs
{
    public class CallHub : Hub
    {


        private static ConcurrentDictionary<string, UserDto> allUsers = new ConcurrentDictionary<string, UserDto>();

        public CallHub() { }
        
        public override async Task OnConnectedAsync()
        {
            //var connectionId = Context.ConnectionId;

            Console.WriteLine($"User Connected: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }


        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"User Disconnected: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }

        //// Send ICE candidate from one client to all others
        //public async Task SendIceCandidate(IceCandidateDto candidate)
        //{
        //    // Forward to all other clients in the same room
        //    await Clients.Others.SendAsync("ReceiveIceCandidate", candidate);
        //}

        //public async Task SendOffer(SessionDescriptionDto offer)
        //{
        //    await Clients.Others.SendAsync("ReceiveOffer", offer);
        //}

        //public async Task SendAnswer(SessionDescriptionDto answer)
        //{
        //    await Clients.Others.SendAsync("ReceiveAnswer", answer);
        //}

        public async Task JoinUser(string username)
        {
            Console.WriteLine($"{username} joined");
            UserDto newUser = new UserDto(Context.ConnectionId, username);
            allUsers.TryAdd(Context.ConnectionId, newUser);
            Console.WriteLine($"All users: ");
            allUsers.Values.ToList().ForEach(u =>
            {
                Console.WriteLine($"ID: ${u.Id}, Username: {u.Username}");
            });
            // optional: notify others
            await Clients.All.SendAsync("UserJoined", allUsers.Values.ToList());
        }

        public async Task SendCallOffer(CallOfferDto callOffer)
        {
            Console.WriteLine($"Call offer sent: {callOffer.ToString()}");
            await Clients.Client(callOffer.To).SendAsync("ReceiveCallOffer", callOffer);
        }

        public async Task SendCallAnswer(CallOfferDto callOffer)
        {
            Console.WriteLine($"Call Answer sent: {callOffer.ToString()}");
            await Clients.Client(callOffer.From).SendAsync("ReceiveCallAnswer", callOffer);
        }

        public async Task SendCandidate(object candidate)
        {
            // optional: notify others
            await Clients.Others.SendAsync("ReceiveCandidate", candidate);
        }
    }
}
