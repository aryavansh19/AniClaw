fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    body: JSON.stringify({
        query: "query { Page(page: 1, perPage: 15) { media(sort: POPULARITY_DESC, type: ANIME) { title { english romaji } coverImage { large extraLarge } } } }"
    })
})
    .then(res => res.json())
    .then(data => console.log(JSON.stringify(data.data.Page.media.map(m => m.coverImage.extraLarge || m.coverImage.large), null, 2)));
