using MeetUp.Api.Dtos;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace MeetUp.Api.Hubs
{
    public class CallHub : Hub
    {


        private static ConcurrentDictionary<string, UserDto> allUsers = new ConcurrentDictionary<string, UserDto>();

        public CallHub() { }
        //public override async Task OnConnectedAsync()
        //{
        //    Console.WriteLine($"User Connected: {Context.ConnectionId}");
        //    await base.OnConnectedAsync();
        //}

        public override async Task OnConnectedAsync()
        {
            //var connectionId = Context.ConnectionId;

            Console.WriteLine($"User Connected: {Context.ConnectionId}");

            // Send connection id back to the connected client
            //await Clients.Caller.SendAsync("ConnectionEstablished", connectionId);

            await base.OnConnectedAsync();
        }


        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"User Disconnected: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }

        //public async Task SendMessage(string message)
        //{
        //    await Clients.All.SendAsync("ReceiveMessage", message);
        //}

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

        //public async Task OfferCandidate(RTCIceCandidate candidate)
        //{
        //    Console.WriteLine($"{username} joined");
        //    this.allUsers.Add(new UserDto(username, new Guid()));

        //    // optional: notify others
        //    await Clients.Others.SendAsync("UserJoined", allUsers);
        //}
    }
}
