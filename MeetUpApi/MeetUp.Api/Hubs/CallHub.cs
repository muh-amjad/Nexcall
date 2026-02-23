using MeetUp.Api.Dtos;
using Microsoft.AspNetCore.SignalR;

namespace MeetUp.Api.Hubs
{
    public class CallHub : Hub
    {
        public List<UserDto> allUsers;

        public CallHub()
        {
            allUsers = new List<UserDto>();
        }
        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"User Connected: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"User Disconnected: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessage(string message)
        {
            await Clients.All.SendAsync("ReceiveMessage", message);
        }

        // Send ICE candidate from one client to all others
        public async Task SendIceCandidate(IceCandidateDto candidate)
        {
            // Forward to all other clients in the same room
            await Clients.Others.SendAsync("ReceiveIceCandidate", candidate);
        }

        public async Task SendOffer(SessionDescriptionDto offer)
        {
            await Clients.Others.SendAsync("ReceiveOffer", offer);
        }

        public async Task SendAnswer(SessionDescriptionDto answer)
        {
            await Clients.Others.SendAsync("ReceiveAnswer", answer);
        }

        public async Task UserJoin(string username)
        {
            Console.WriteLine($"{username} joined");
            this.allUsers.Add(new UserDto(username, new Guid()));

            // optional: notify others
            await Clients.Others.SendAsync("UserJoined", allUsers);
        }
    }
}
