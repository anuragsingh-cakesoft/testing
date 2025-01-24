import { promises as fs } from 'fs';

async function analyzeComments() {
    try {
        console.log('Reading raw data file...');
        const rawData = await fs.readFile('./all_withr.json', 'utf-8');
        const allResponses = JSON.parse(rawData);
        
        const structuredComments = {};
        let debugCount = 0;

        for (const response of allResponses) {
            // Get items from the response
            const endpoints = response.onResponseReceivedEndpoints?.[0];
            let items;

            if (endpoints?.reloadContinuationItemsCommand?.continuationItems) {
                items = endpoints.reloadContinuationItemsCommand.continuationItems;
            } else if (endpoints?.appendContinuationItemsAction?.continuationItems) {
                items = endpoints.appendContinuationItemsAction.continuationItems;
            }

            if (!items) continue;

            for (const item of items) {
                // Handle main comments
                if (item.commentThreadRenderer) {
                    const mainComment = item.commentThreadRenderer.comment?.commentRenderer;
                    if (!mainComment) continue;

                    const commentId = mainComment.commentId;
                    if (commentId) {
                        structuredComments[commentId] = {
                            type: 'main',
                            id: commentId,
                            text: mainComment.contentText?.runs?.[0]?.text,
                            author: mainComment.authorText?.simpleText,
                            replyCount: mainComment.replyCount || 0,
                            timestamp: mainComment.publishedTimeText?.simpleText,
                            replies: {}
                        };
                        debugCount++;
                        if (debugCount <= 3) {
                            console.log('\nFound main comment:', commentId);
                            console.log('Text:', structuredComments[commentId].text?.substring(0, 50) + '...');
                        }
                    }
                }

                // Handle replies (commentViewModel format)
                if (item.commentViewModel) {
                    const reply = item.commentViewModel;
                    const replyId = reply.commentId;
                    const parentId = reply.parentCommentId;

                    if (parentId && replyId && structuredComments[parentId]) {
                        structuredComments[parentId].replies[replyId] = {
                            type: 'reply',
                            id: replyId,
                            parentId: parentId,
                            text: reply.contentText?.runs?.[0]?.text,
                            author: reply.authorText?.simpleText,
                            timestamp: reply.publishedTimeText?.simpleText
                        };
                        if (debugCount <= 3) {
                            console.log('\nFound reply:', replyId);
                            console.log('Parent:', parentId);
                            console.log('Text:', structuredComments[parentId].replies[replyId].text?.substring(0, 50) + '...');
                        }
                    }
                }
            }
        }

        console.log('\nSaving structured data...');
        await fs.writeFile(
            './analyzed_comments.json', 
            JSON.stringify(structuredComments, null, 2), 
            'utf-8'
        );
        
        // Print statistics
        const mainCommentCount = Object.keys(structuredComments).length;
        const replyCount = Object.values(structuredComments).reduce(
            (total, comment) => total + Object.keys(comment.replies).length, 
            0
        );
        
        console.log(`
Analysis complete:
- Main comments: ${mainCommentCount}
- Total replies: ${replyCount}
- Total interactions: ${mainCommentCount + replyCount}
        `);
        
    } catch (error) {
        console.error('Error analyzing comments:', error);
    }
}

analyzeComments(); 