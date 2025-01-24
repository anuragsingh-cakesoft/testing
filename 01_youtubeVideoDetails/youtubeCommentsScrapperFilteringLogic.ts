interface StructuredComment {
    youTubeComment: any;
    googlePerson: any;
    youTubeReplies: {
        youTubeReply: any;
        googlePerson: any;
    }[];
}

export function processYouTubeComments(allComments: any[], shallExtractReplies: boolean): StructuredComment[] {
    const commentMap = new Map<string, StructuredComment>();
    const structuredComments: StructuredComment[] = [];

    // Process all responses
    for (const response of allComments) {
        const mutations = response?.frameworkUpdates?.entityBatchUpdate?.mutations;
        if (!mutations) continue;

        for (const mutation of mutations) {
            const payload = mutation?.payload?.commentEntityPayload;
            if (!payload || !payload.properties || !payload.author) continue;

            const commentId = payload.properties.commentId;
            const replyLevel = payload.properties.replyLevel;

            if (replyLevel === 0) {
                // This is a main comment
                const structuredComment: StructuredComment = {
                    youTubeComment: mutation,
                    googlePerson: payload.author,
                    youTubeReplies: []
                };
                commentMap.set(commentId, structuredComment);
                structuredComments.push(structuredComment);
            } else if (replyLevel === 1) {
                // This is a reply
                if(shallExtractReplies){
                    const parentCommentId = commentId.split('.')[0];
                    const parentComment = commentMap.get(parentCommentId);
                    
                    if (parentComment) {
                        parentComment.youTubeReplies.push({
                            youTubeReply: mutation,
                            googlePerson: payload.author
                        });
                    }
                }
            }
        }
    }

    return structuredComments;
} 