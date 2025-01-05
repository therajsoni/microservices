const logger = require("../utils/logger.js");
const Post = require("../models/Post.js");
const { validatePost } = require("../utils/valiadtion.js");
const { publishEvent } = require("../utils/rabbitmq.js");

async function invalidatePostCache(req, input) {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  logger.info("createPost ....");
  try {
    const { error } = validatePost(req.body);
    if (error) {
      logger.warn("valiadtion error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { mediaIds, content } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });
    await newlyCreatedPost.save();
    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });
    await invalidatePostCache(req, newlyCreatedPost._id.toString());
    logger.info("Post created successfully", newlyCreatedPost);
    return res.status(201).json({
      success: true,
      message: `Post created successfully!`,
    });
  } catch (error) {
    logger.error(`Error creating post`, error);
    return res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};
const getAllPost = async (req, res) => {
  logger.info("getAllPost ....");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const cacheKey = `posts:${page}:${limit}`;
    const chachedPosts = await req.redisClient.get(cacheKey);

    if (chachedPosts) {
      return res.json(JSON.parse(chachedPosts));
    }

    let posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);
    if (posts.length === 0) {
      logger.info("No post here");
      return res.status(200).json({
        success: false,
        message: "No post here",
        posts,
      });
    }
    const total = await Post.countDocuments();
    logger.info("ok get");
    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total,
    };
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
    return res.status(200).json({
      success: true,
      message: "get",
      result,
    });
    // save your posts in redis client
  } catch (error) {
    logger.error(`Error getAllPost`, error);
    return res.status(500).json({
      success: false,
      message: "Error getAllPost",
    });
  }
};
const getPost = async (req, res) => {
  logger.info("getPost ....");
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }
    let post = await Post.find(postId);
    if (!post) {
      logger.warn("Post not found!");
      return res.status(400).json({
        success: false,
        message: `Post not found`,
      });
    }
    logger.info("post get successfully!");
    await req.redisClient.setex(cachedPost, 3600, JSON.stringify(post));
    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    logger.error(`Error getPost`, error);
    return res.status(500).json({
      success: false,
      message: "Error getPost",
    });
  }
};

const deletePost = async (req, res) => {
  logger.info("deletePost ....");
  try {
    const postId = req.params.id;
    let post = await Post.findByIdAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    if (!post) {
      logger.warn("Post not found!");
      return res.status(400).json({
        success: false,
        message: `Post not found`,
      });
    }
    logger.info("post deleted successfully!");

    // publish post delete method
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    }); // . need

    await invalidatePostCache(req, req.params.id);
    return res.status(200).json({
      success: true,
      post,
      id: postId,
    });
  } catch (error) {
    logger.error(`Error deletePost`, error);
    return res.status(500).json({
      success: false,
      message: "Error deletePost",
    });
  }
};
module.exports = { getPost, createPost, getAllPost, deletePost };
