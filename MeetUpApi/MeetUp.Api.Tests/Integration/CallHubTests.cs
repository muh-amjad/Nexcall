using MeetUp.Api.Dtos.Auth;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace MeetUp.Api.Tests.Integration;

public class CallHubTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CallHubTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Online_User_Search_And_Call_Initiation_Should_Work()
    {
        var callerAuth = await SignupAndLogin("caller-user", "caller@meetup.test");
        var calleeAuth = await SignupAndLogin("callee-user", "callee@meetup.test");

        var calleeIncomingCall = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);

        await using var calleeHub = BuildHubConnection(calleeAuth.Token);
        calleeHub.On<JsonElement>("ReceiveIncomingCall", payload =>
        {
            calleeIncomingCall.TrySetResult(payload);
        });

        await calleeHub.StartAsync();
        await calleeHub.InvokeAsync("JoinUser");

        var searchRequest = new HttpRequestMessage(HttpMethod.Get, "/api/users/search?query=callee");
        searchRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", callerAuth.Token);
        var searchResponse = await _client.SendAsync(searchRequest);
        searchResponse.EnsureSuccessStatusCode();

        var searchJson = await searchResponse.Content.ReadAsStringAsync();
        using var searchDocument = JsonDocument.Parse(searchJson);
        var firstResult = searchDocument.RootElement.EnumerateArray().First();
        Assert.True(firstResult.GetProperty("isOnline").GetBoolean());
        var calleeConnectionId = firstResult.GetProperty("connectionId").GetString();
        Assert.False(string.IsNullOrWhiteSpace(calleeConnectionId));

        await using var callerHub = BuildHubConnection(callerAuth.Token);
        await callerHub.StartAsync();
        await callerHub.InvokeAsync("JoinUser");

        await callerHub.InvokeAsync("StartCall", calleeConnectionId!);

        var completed = await Task.WhenAny(calleeIncomingCall.Task, Task.Delay(TimeSpan.FromSeconds(8)));
        Assert.True(completed == calleeIncomingCall.Task, "Callee did not receive incoming call event.");

        var incomingPayload = await calleeIncomingCall.Task;
        Assert.Equal("caller-user", incomingPayload.GetProperty("fromUsername").GetString());
    }

    private async Task<AuthResponseDto> SignupAndLogin(string username, string email)
    {
        var signupResponse = await _client.PostAsJsonAsync("/api/auth/signup", new SignupRequestDto
        {
            Username = username,
            Email = email,
            Password = "Password123!"
        });

        signupResponse.EnsureSuccessStatusCode();
        var signupAuth = await signupResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        return signupAuth!;
    }

    private HubConnection BuildHubConnection(string accessToken)
    {
        return new HubConnectionBuilder()
            .WithUrl(new Uri(_client.BaseAddress!, "/callHub"), options =>
            {
                options.AccessTokenProvider = () => Task.FromResult(accessToken)!;
                options.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
                options.Transports = HttpTransportType.LongPolling;
            })
            .Build();
    }
}
