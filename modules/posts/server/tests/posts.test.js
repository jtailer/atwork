'use strict';

/**
 * Load Prerequisites
 */
var expect = require('chai').expect,
  mongoose = require('mongoose'),
  Post = mongoose.model('Post'),
  User = mongoose.model('User')
  ;

/**
 * System is available as a global object for testing purposes
 * @type {Object}
 */
var System = global.System;

var myController = require('../controllers/posts');
var posts = myController(System);
var samplePosts = [];

/**
 * This will hold all temporarily added records, which will be deleted at the end of the tests
 * @type {Object}
 */
var temps = {};
var user = {};
var user2 = {};
var post = {};
var post2 = {};

describe('<Unit Test>', function() {
  describe('Model Post:', function() {

    beforeEach(function(done) {
      temps = {};
      user = new User({
        name: 'Full name',
        email: 'test@test.com',
        password: 'password'
      });

      user2 = new User({
        name: 'Full name 2',
        email: 'test@test2.com',
        password: 'password'
      });

      user.save(function() {
        user2.save(function() {

          post = new Post({
            content: 'Test Post',
            creator: user._id
          });

          post2 = new Post({
            content: 'Test Post',
            creator: user2._id
          });

          post.save(function() {
            post2.save(function() {
              samplePosts.push(post._id);
              samplePosts.push(post2._id);
              done();
            });
          });
        });
      });
      
    });

    /**
     * Save Post
     */
    describe('Method create', function() {
      it('should be able to save a new post', function(done) {
        expect(posts).respondTo('create');

        var sampleRequest = {
          user: user,
          body: {
            content: 'Sample post for testing'
          }
        };
        posts.create(sampleRequest, {
          send: function(output) {
            expect(output.success).to.equal(1);
            samplePosts.push(output.res._id);
            done();
          }
        });
      });
      it('should be not save a post without content', function(done) {
        expect(posts).respondTo('create');

        var sampleRequest = {
          user: user,
          body: {
            content: ''
          }
        };
        posts.create(sampleRequest, {
          send: function(output) {
            expect(output.success).to.equal(0);
            done();
          }
        });
      });

      it('should not be able to save a new post without a user logged in', function(done) {
        expect(posts).respondTo('create');

        var sampleRequest = {
          body: {
            content: 'Sample post for testing'
          }
        };
        var errorFn = function() {
          posts.create(sampleRequest);
        };
        expect(errorFn).to.throw(Error);
        done();
      });
    });


    /**
     * Get timeline
     */
    describe('Method timeline', function() {
      it('should be able to show posts in timeline', function(done) {
        expect(posts).respondTo('timeline');

        var sampleRequest = {
          params: {
            userId: user._id
          },
          user: user
        };
        posts.timeline(sampleRequest, {
          send: function(output) {
            expect(output.success).to.equal(1);
            expect(output.res.records).to.be.instanceof(Array);
            expect(output.res.records).to.have.length(1);
            expect(output.res.records[0]._id.toString()).to.equal(post._id.toString());
            done();
          }
        });
      });
    });


    /**
     * Get single
     */
    describe('Method single', function() {
      it('should be able to show single post', function(done) {
        expect(posts).respondTo('single');

        var sampleRequest = {
          params: {
            postId: post._id
          },
          user: user
        };
        posts.single(sampleRequest, {
          send: function(output) {
            expect(output.success).to.equal(1);
            expect(output.res.record).to.be.instanceof(Object);
            expect(output.res.record).to.not.be.undefined;
            expect(output.res.record._id.toString()).to.equal(post._id.toString());
            done();
          }
        });
      });
      it('should be able to handle db errors', function(done) {
        expect(posts).respondTo('single');

        var sampleRequest = {
          params: {
            postId: 'invalid-id'
          },
          user: user
        };
        posts.single(sampleRequest, {
          send: function(output) {
            expect(output.success).to.equal(0);
            done();
          }
        });
      });
      it('should be able to handle non-existent post id', function(done) {
        expect(posts).respondTo('single');

        var sampleRequest = {
          params: {
            postId: user._id
          },
          user: user
        };
        posts.single(sampleRequest, {
          send: function(output) {
            expect(output.success).to.equal(0);
            done();
          }
        });
      });
    });

    /**
     * Do like
     */
    describe('Method like/unlike', function() {
      it('should be able to like and unlike a post', function(done) {
        expect(posts).respondTo('like');
        expect(posts).respondTo('unlike');

        var sampleRequest = {
          params: {
            postId: post2._id
          },
          user: user
        };

        function doLike(cb) {
          posts.like(sampleRequest, {
            send: function(output) {
              expect(output.success).to.equal(1);
              expect(output.res.record).to.be.instanceof(Object);
              expect(output.res.record).to.not.be.undefined;
              expect(output.res.record.likes).to.be.instanceof(Array);
              expect(output.res.record.likes).to.contain(user._id);
              cb();
            }
          });
        }
        function doFailedLike(cb) {
          posts.like(sampleRequest, {
            send: function(output) {
              expect(output.success).to.equal(0);
              cb();
            }
          });
        }
        function undoLike(cb) {
          posts.unlike(sampleRequest, {
            send: function(output) {
              expect(output.success).to.equal(1);
              expect(output.res.record).to.be.instanceof(Object);
              expect(output.res.record).to.not.be.undefined;
              expect(output.res.record.likes).to.be.instanceof(Array);
              expect(output.res.record.likes).to.not.contain(user._id);
              cb();
            }
          });
        }
        function undoFailedLike(cb) {
          posts.unlike(sampleRequest, {
            send: function(output) {
              expect(output.success).to.equal(0);
              cb();
            }
          });
        }

        /**
         * Here we are covering use cases related to like/unlike:
         * Like successfully
         * Liking again will not work
         * Unlike successfully
         * Unliking again will not work
         * Liking via passing non-existing post id will not work
         * Unliking via passing non-existing post id will not work
         * Liking via passing invalid post id will not work
         * Unliking via passing invalid post id will not work
         */
        doLike(function() {
          doFailedLike(function() {
            undoLike(function() {
              undoFailedLike(function() {
                sampleRequest.params.postId = user._id; //simulating a non-existent ObjectId
                doFailedLike(function() {
                  undoFailedLike(function() {
                    sampleRequest.params.postId = 'invalid-id'; //simulating an invalid ObjectId format
                    doFailedLike(function() {
                      undoFailedLike(done);
                    });
                  });
                });
              });
            });
          });
        });

      });
    });


    /**
     * Get feed
     */
    describe('Method feed', function() {
      it('should be able to get feed of user logged in', function(done) {
        expect(posts).respondTo('feed');

        var sampleRequest = {
          user: user
        };
        posts.feed(sampleRequest, {
          send: function(output) {
            expect(output.success).to.equal(1);
            expect(output.res.records).to.be.instanceof(Array);
            expect(output.res.records).to.have.length(1); //not yet following anyone, so only self posts
            expect(output.res.records[0]._id.toString()).to.equal(post._id.toString());
            done();
          }
        });
      });
      
    });

    afterEach(function(done) {
      var removed = 0;
      var toRemove = samplePosts.length;
      for (var i in samplePosts) {
        Post.remove({_id: samplePosts[i]}, function() {
          removed++;
          if (removed == toRemove) {
            user.remove(function() {
              user2.remove(function() {
                done();
              });
            });
          }
        });
      };
    });
  

  });
});

