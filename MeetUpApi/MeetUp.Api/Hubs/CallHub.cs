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
            await Clients.Others.SendAsync("ReceiveCandidate", candidate);
        }
    }
}
