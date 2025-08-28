import axios from "axios";


(async () => {
  const res = await axios.get(
    "https://www.ebay.com/sch/i.html?_nkw=charizard&LH_Sold=1&LH_Complete=1&_pgn=1",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml",
      },
    }
  );

  console.log(res.data.slice(0, 500));
})();