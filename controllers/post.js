const _ = require('lodash');

const Post = require('../models/post');
const formidable = require("formidable");
const fs = require("fs");

exports.postById = (req, res, next, id) => {
    Post.findById(id)
        .populate("postedBy", "_id name role")
        .populate(
            {
                path: 'comments',
                select: 'text created',
                populate: {
                    path: 'postedBy',
                    select: '_id name'
                }
            }
        )
        .exec((err, post) => {
            if (err || !post) {
                return res.status(400).json({
                    error: err
                })
            }
            req.post = post
            next()
        })
};

exports.getPosts = async (req, res) => {
    // get current page from req.query or use default value of 1
    const currentPage = req.query.page || 1;
    // return 6 posts per page
    const perPage = 6;
    let totalItems;

    const posts = await Post.find()
        // countDocuments() gives you total count of posts
        .countDocuments()
        .then(count => {
            totalItems = count;
            return Post.find()
                .skip((currentPage - 1) * perPage)
                .populate("postedBy", "_id name")
                .populate(
                    {
                        path: 'comments',
                        select: 'text created',
                        populate: {
                            path: 'postedBy',
                            select: '_id name'
                        }
                    },
                )
                .sort({ created: -1 })
                .limit(perPage)
                .select("post._id title body created likes");
        })
        .then(posts => {
            res.status(200).json(posts);
        })
        .catch(err => console.log(err));
};

exports.getPostsForTimeline = (req, res) => {
    let following = req.profile.following
    following.push(req.profile._id)
    Post.find({ postedBy: { $in: req.profile.following } })
        .populate('postedBy', '_id name')
        .populate(
            {
                path: 'comments',
                select: 'text created',
                populate: {
                    path: 'postedBy',
                    select: '_id name'
                }
            },
        )
        .sort('-created')
        .exec((err, posts) => {
            if (err) {
                return res.status(400).json({
                    error: err
                })
            }
            res.status(200).json(posts);
        })
};

exports.createPost = (req, res, next) => {
    let form = new formidable.IncomingForm();
    form.keepExtensions = true
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(400).json({
                error: "Image could not be uploaded"
            })
        }
        let post = new Post(fields)

        req.profile.hashed_password = undefined
        req.profile.salt = undefined
        post.postedBy = req.profile

        if (files.photo) {
            post.photo.data = fs.readFileSync(files.photo.filepath)
            post.photo.contentType = files.photo.type
        }
        post.save((err, result) => {
            if (err) {
                return res.status(400).json({
                    error: err
                })
            }
            res.json(result)
        })
    })



    /*
    const post = new Post(req.body);
    // console.log("Creating post: ", post);
    // post.save((err, result) => {
    //     if( err ) {
    //         return  res.status(400).json({
    //             error: err
    //         });
    //     }
    //     res.status(200).json({
    //         post: result
    //     });
    // })

    post.save()
        .then(result => {
            res.status(200).json({
                post: result
            });
        })
    */
};

exports.postsByUser = (req, res) => {
    Post.find({ postedBy: req.profile._id })
        .populate("postedBy", "_id name")
        .select("_id title body created")
        .sort("_created")
        .exec((err, posts) => {
            if (err) {
                return res.status(400).json({
                    error: err
                })
            }
            res.json(posts)
        })
};

exports.isPoster = (req, res, next) => {
    let sameUser = req.post && req.auth && req.post.postedBy._id == req.auth._id
    let adminUser = req.post && req.auth && req.auth.role === 'admin'

    let isPoster = sameUser || adminUser

    if (!isPoster) {
        return res.status(403).json({
            error: "User is not authorized"
        })
    }
    next()
};

exports.deletePost = (req, res) => {
    let post = req.post
    post.remove((err, post) => {
        if (err) {
            return res.status(400).json({
                error: err
            })
        }
        res.json({ message: "Post deleted successfully" })
    })
};

// exports.updatePost = (req, res, next) => {
//     let post = req.post
//     post = _.extend(post, req.body)
//     post.updated = Date.now()
//     post.save((err) => {
//         if (err) {
//             return res.status(400).json({
//                 error: "You are not authorized to perform this action"
//             })
//         }
//         res.json(post)
//     })
// };

exports.updatePost = (req, res, next) => {
    let form = new formidable.IncomingForm()
    form.keepExtensions = true
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(400), json({
                error: "Photo could not be uploaded"
            })
        }

        // save post
        let post = req.post
        post = _.extend(post, fields)
        post.updated = Date.now()
        if (files.photo) {
            post.photo.data = fs.readFileSync(files.photo.filepath)
            post.photo.contentType = files.photo.type
        }

        post.save((err, result) => {
            if (err) {
                return res.status(400).json({
                    error: err
                })
            }
            res.json(post)
        })

    })

};

exports.photo = (req, res, next) => {
    if (req.post.photo.data) {
        res.set("Content-Type", req.post.photo.contentType);
        return res.send(req.post.photo.data);
    }
    next()
}

exports.singlePost = (req, res) => {
    return res.json(req.post);
}

exports.like = (req, res) => {
    Post.findByIdAndUpdate(
        req.body.postId,
        { $push: { likes: req.body.userId } },
        { new: true }
    ).exec((err, result) => {
        if (err) {
            return res.status(400).json({ error: err })
        } else {
            res.json(result)
        }
    });
}

exports.unlike = (req, res) => {
    Post.findByIdAndUpdate(
        req.body.postId,
        { $pull: { likes: req.body.userId } },
        { new: true }
    ).exec((err, result) => {
        if (err) {
            return res.status(400).json({ error: err })
        } else {
            res.json(result)
        }
    });
}

exports.comment = (req, res) => {
    let comment = req.body.comment
    comment.postedBy = req.body.userId
    Post.findByIdAndUpdate(
        req.body.postId,
        { $push: { comments: comment } },
        { new: true }
    )
        .populate('comments.postedBy', '_id name')
        .populate('postedBy', '_id name')
        .exec((err, result) => {
            if (err) {
                return res.status(400).json({ error: err })
            } else {
                res.json(result)
            }
        });
}

exports.uncomment = (req, res) => {
    let comment = req.body.comment
    Post.findByIdAndUpdate(
        req.body.postId,
        {
            $pull: {
                comments: {
                    _id: comment._id
                }
            }
        },
        { new: true }
    )
        .populate('comments.postedBy', '_id name')
        .populate('postedBy', '_id name')
        .exec((err, result) => {
            if (err) {
                return res.status(400).json({ error: err })
            } else {
                res.json(result)
            }
        });
}