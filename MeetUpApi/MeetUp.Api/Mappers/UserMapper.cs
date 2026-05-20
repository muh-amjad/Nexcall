using Nexcall.Api.Dtos.Users;
using Nexcall.Api.Entities;

namespace Nexcall.Api.Mappers
{
    public static class UserMapper
    {
        public static UserSearchResultDto ToSearchResultDto(ApplicationUser user, bool isOnline, string? connectionId)
        {
            return new UserSearchResultDto
            {
                UserId = user.Id,
                Username = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                IsOnline = isOnline,
                ConnectionId = connectionId,
            };
        }
    }
}
