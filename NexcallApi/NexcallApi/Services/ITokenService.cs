using Nexcall.Api.Dtos.Auth;
using Nexcall.Api.Entities;

namespace Nexcall.Api.Services
{
    public interface ITokenService
    {
        AuthResponseDto CreateAuthResponse(ApplicationUser user, string refreshToken);
        string GenerateRefreshToken();
    }
}
