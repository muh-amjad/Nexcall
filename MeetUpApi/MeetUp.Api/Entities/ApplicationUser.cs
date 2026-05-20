using Microsoft.AspNetCore.Identity;

namespace Nexcall.Api.Entities
{
    public class ApplicationUser : IdentityUser
    {
        public string DisplayName { get; set; } = string.Empty;
    }
}
