using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

[Route("api/[controller]")]
[ApiController]
public class InvoiceReadController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _apiKey;
    private readonly ILogger<InvoiceReadController> _logger;

    public InvoiceReadController(
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<InvoiceReadController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _apiKey = config["OpenAI:ApiKey"];
        _logger = logger;
    }

    [HttpPost("read")]
    public async Task<IActionResult> ReadInvoice([FromForm] IFormFile image)
    {
        _logger.LogInformation("📥 Received invoice image for reading");

        if (image == null || image.Length == 0)
        {
            _logger.LogWarning("⚠️ No image uploaded");
            return BadRequest("No image uploaded.");
        }

        using var ms = new MemoryStream();
        await image.CopyToAsync(ms);
        var base64Image = Convert.ToBase64String(ms.ToArray());
        var dataUrl = $"data:image/png;base64,{base64Image}";

        _logger.LogInformation("🖼️ Image converted to base64 format");

        var prompt = "Extract the following from this invoice image and return a raw JSON object with fields: " +
                     "invoiceNumber (string), companyName (string), invoiceDate (MM/DD/YYYY string), " +
                     "items (array of { category: string, amount: number }). Return ONLY valid JSON. Do NOT wrap in code blocks.";

        var requestBody = new
        {
            model = "gpt-4-turbo",
            messages = new[]
            {
                new {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "text", text = prompt },
                        new { type = "image_url", image_url = new { url = dataUrl } }
                    }
                }
            },
            max_tokens = 1000
        };

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        _logger.LogInformation("📡 Sending request to OpenAI...");

        var response = await client.PostAsync(
            "https://api.openai.com/v1/chat/completions",
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        );

        var resultJson = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("❌ OpenAI API failed: {Status} - {Error}", response.StatusCode, resultJson);
            return StatusCode((int)response.StatusCode, resultJson);
        }

        _logger.LogInformation("✅ OpenAI response received");

        string? content;
        try
        {
            content = JsonDocument.Parse(resultJson)
                .RootElement.GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            _logger.LogInformation("🧠 Raw content from OpenAI:\n{Content}", content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract 'content' from OpenAI response.");
            return BadRequest("Could not parse response from OpenAI.");
        }

        // ✅ Clean up content: remove ```json wrappers if present
        content = content?.Trim().Trim('`');
        if (content.StartsWith("json", StringComparison.OrdinalIgnoreCase))
            content = content[4..].Trim();

        try
        {
            var parsed = JsonSerializer.Deserialize<JsonElement>(content!);
            _logger.LogInformation("✅ Successfully parsed content to JSON.");
            return Ok(parsed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to parse JSON from content.");
            return BadRequest("Failed to parse JSON from OpenAI output:\n" + content);
        }
    }
}
