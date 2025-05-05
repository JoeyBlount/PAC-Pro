var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();           // Enables [ApiController] support
builder.Services.AddHttpClient();            // For calling external APIs like OpenAI
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();            // Optional, but useful

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();

app.MapControllers(); // Enables your custom controllers

app.Run();
