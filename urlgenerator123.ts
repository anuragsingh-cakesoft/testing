import { generateYoutubeSearchUrl } from './urlgenerator.js';

// Test all combinations
function testUrlGenerator() {
    const searchQuery = "Hello World";
    const types: ('All' | 'Shorts' | 'Videos' | 'Channel')[] = ['All', 'Shorts', 'Videos', 'Channel'];
    const uploadDates: ('Last hour' | 'Today' | 'This week' | 'This month' | 'This year')[] = 
        ['Last hour', 'Today', 'This week', 'This month', 'This year'];
    const sortBy: ('Relevance' | 'Upload date' | 'View count' | 'Rating')[] = 
        ['Relevance', 'Upload date', 'View count', 'Rating'];

    console.log('=== Basic Search ===');
    console.log(generateYoutubeSearchUrl({ searchQuery }));

    console.log('\n=== Testing Content Types ===');
    types.forEach(type => {
        console.log(`\nType: ${type}`);
        console.log(generateYoutubeSearchUrl({ searchQuery, type }));
    });

    console.log('\n=== Testing Channel Type Specifically ===');
    // 1st test: Channel with Default Sort
    console.log('\n1. Channel with Default Sort:');
    console.log(generateYoutubeSearchUrl({ 
        searchQuery, 
        type: 'Channel'
    }));

    // 2nd test: Channel with Upload Date (should be ignored)
    console.log('\n2. Channel with Upload Date (should be ignored):');
    console.log(generateYoutubeSearchUrl({ 
        searchQuery, 
        type: 'Channel',
        uploadDate: 'Today'
    }));

    // 3rd test: Channel with all combinations of Sort By
    console.log('\n3. Channel with all Sort By combinations:');
    sortBy.forEach(sort => {
        console.log(`\nChannel with Sort By: ${sort}`);
        console.log(generateYoutubeSearchUrl({ 
            searchQuery, 
            type: 'Channel',
            sortBy: sort
        }));
    });

    console.log('\n=== Testing Upload Dates Only ===');
    uploadDates.forEach(uploadDate => {
        console.log(`\nUpload Date: ${uploadDate}`);
        console.log(generateYoutubeSearchUrl({ searchQuery, uploadDate }));
    });

    console.log('\n=== Testing Sort By Only ===');
    sortBy.forEach(sort => {
        console.log(`\nSort By: ${sort}`);
        console.log(generateYoutubeSearchUrl({ searchQuery, sortBy: sort }));
    });

    console.log('\n=== Testing Combinations of Sort By and Upload Date ===');
    sortBy.forEach(sort => {
        uploadDates.forEach(date => {
            console.log(`\nSort By: ${sort}, Upload Date: ${date}`);
            console.log(generateYoutubeSearchUrl({ 
                searchQuery, 
                sortBy: sort, 
                uploadDate: date 
            }));
        });
    });
}

// Run the tests
testUrlGenerator();

/* Expected Results Pattern:
Basic search:
https://www.youtube.com/results?search_query=Hello+World

Channel searches:
1. Default: ...&sp=CAASAhAC
2. With Upload Date (ignored): ...&sp=CAASAhAC
3. Sort combinations:
   Relevance: ...&sp=CAASAhAC
   Upload date: ...&sp=CAISAhAC
   View count: ...&sp=CAMSAhAC
   Rating: ...&sp=CAESAhAC

Regular searches:
Sort by only:
Relevance: ...&sp=CAASAHAB
Upload date: ...&sp=CIASAHAB
View count: ...&sp=CMASAHAB
Rating: ...&sp=CEASAHAB

Upload date only:
Last hour: ...&sp=EgIIAQ%253D%253D
Today: ...&sp=EgIIAg%253D%253D
This week: ...&sp=EgIIAw%253D%253D
This month: ...&sp=EgIIBA%253D%253D
This year: ...&sp=EgIIBQ%253D%253D
*/ 