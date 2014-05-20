/* jslint browser: true, devel: true, expr: true */
/* globals chrome, chromecast */

/*
 * Copyright (c) 2014 Kiril Vatev
 * The MIT License (MIT)
 */

!function(global, undefined){
    /**
     * @description An Event Emitter object
     * @constructor
     * @private
     */
    var EventEmitter = function(){
        var events = {};
        
        this.on = function(name, callback){
            events[name] = events[name] || [];
            events[name].push(callback);
            
            return this;
        };
        
        this.off = function(name, callback){
            if (name in events === false) return this;
            events[name].splice(events[name].indexOf(callback), 1);
            return this;
        };
        
        this.once = function(name, callback){
            function disposable(){
                this.off(name, disposable);
                callback.apply(this, arguments);
            }
            
            this.on(name, disposable);
        };
        
        this.trigger = function(name){
            var that = this;
            var args = arguments;
            if (name in events === false) return this;
            events[name].forEach(function(fn){
                fn.apply(that, [].slice.call(args, 1));
            });
        };
    };
    
    /**
     * @description Create new Chromecast error objects
     * @private
     * @param {string} type
     * @param {Array} args
     * @param {boolean} permanent Optional
     */
    var CastError = function(type, args, permanent){
        var err = new Error(type);
        err.arguments = args;
        err.permanent = !!permanent;
        return err;
    };
    
    /**
     * @description Enumerable of erros the Chromecast creates
     * @enum {string}
     */
    CastError.type = {
        mediaError: 'mediaError',
        sessionError: 'sessionError',
        extensionError: 'extensionError'
    };
    
    /**
     * @description An object to set private methods and properties.
     * @private
     */
    var privateGlobal = {};
    privateGlobal.events = new EventEmitter();
    
    /**
     * @description The Cast API constructor
     * @constructor
     * @protected
     */
    var Cast = function(){
        var that = this;
        
        /**
         * @description The current Chromecast session
         */
        this.session = undefined;
        /**
         * @description The current application ID
         */
        this.appID = undefined;
        /**
         * @description The current Media object
         */
        this.media = undefined;
        
        var available = false;
        this.isAvailable = function(){ return available; };
        privateGlobal.setAvailable = function(bool){ 
            available = !!bool;
            privateGlobal.events.trigger(that.Events.ready);
        };
        
        var initialized = false;
        this.isInitialized = function(){ return initialized; };
        privateGlobal.setInitialized = function(bool){
            initialized = !!bool;
            privateGlobal.events.trigger(that.Events.initialized);
        };
        
        this.getMedia = function(){ return this.media; };
        privateGlobal.setMedia = function(media){
            that.media = media;
            this.media = that.media;
        };
    };
    
    /**
     * @description Set the `applicationID` of your app.
     * You can call this before casting is available, and this ID will be used to initialize
     * the session once casting is available. If you call this after casting is available, it will 
     * automatically initialize the session using this ID. You can call this only once, and all 
     * subsequent times will be ignored.
     * @param {string} applicationID [Optional] This is your app key. If left blank,
     * the session will be configured to use the default media player.
     */
    Cast.prototype.setAppId = function setAppId(applicationID){
        //there is no ID, we can assign it
        if (!this.appID) {
            this.appID = applicationID || chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
        }
        
        //casting is available on this page
        if (this.isInitialized()){
            this.initCast();   
        }
        
        return this;
    };
    
    /**
     * @description This is a media type enumerable for convenience.
     * @enum {string}
     */
    Cast.prototype.MediaTypes = {
        video: 'video/mp4',
        audio: 'audio/mp3',
        image: 'image/jpg'
    };
    
    /**
     * @description This is an enumerable of the events that the Chromecast emits
     * @enum {string}
     */
    Cast.prototype.Events = {
        error: 'error',
        ready: 'ready',
        available: 'available',
        initialized: 'initialized',
        session: 'session',
        mediaDiscovered: 'mediaDiscovered', //media is playing?
        mediaControl: 'mediaControl',
        extensionLoaded: 'extensionLoaded'
    };
    
    /**
     * @description Start playing a new video.
     * @param {string} url The public URL of the video to play.
     * @param {Object} info [Optional] Info about the video.
     */
    Cast.prototype.startCast = function startCast(url, info){
        var that = this;
        
        //event when media starts playing?
        function onMediaDiscovered(media){
            console.log('onmediadiscovered', arguments);
            
            privateGlobal.setMedia(media);
            
            //TODO args?
            //TODO event name should be "playing"?
            privateGlobal.events.trigger(that.Events.mediaDiscovered);
        }

        //event if there is an error with the media
        function onMediaError(){
            console.log('onmediaerror', arguments);
            var err = CastError(CastError.type.mediaError, arguments);
            privateGlobal.events.trigger(that.Events.error, err);
        }
        
        //plays the video using the current session
        function playVideo(){
            //create new media request
            var mediaRequest = that.getMediaRequest(url, info);

            that.session.loadMedia(mediaRequest, onMediaDiscovered, onMediaError);        
        }
        
        if (that.session){
            //there is already a session, use it
            playVideo();
        }
        else{
            //there is no session, create one
            that.getNewSession(playVideo, function(err){
                console.log('error with playing video', err);
                //TODO is this permanent
                var customErr = CastError(CastError.type.sessionError, arguments);
                privateGlobal.events.trigger(that.Events.error, customErr);
            });
        }
    };
    
    Cast.prototype.getNewSession = function getNewSession(onSuccess, onError){
        var that = this;
        
        //event when a session is fetched
        var onRequestSessionSuccess = function(session){
            console.log('onrequestsuccess', arguments);
            
            //save the session to reuse later
            that.session = session;
            
            //fire event
            privateGlobal.events.trigger(that.Events.session, session);

            //call the success callback
            onSuccess && onSuccess(session);
        };

        //event if there is an error with getting a session
        var onLaunchError = function(err){
            console.log('onlauncherror', arguments);
            
            //call the error callback
            onError && onError.apply(null, err);
            
            //error event handled in the `onError` function above
        };

        //request a session
        chrome.cast.requestSession(onRequestSessionSuccess, onLaunchError);
    };
    
    Cast.prototype.getMediaRequest = function(url, info){
        //create new mediaInfo object
        var mediaInfo = new chrome.cast.media.MediaInfo(url);

        info = info || {};
        //make sure some defaults exist
        info.title = info.title || url;
        info.subtitle = info.subtitle || 'Using FriendlyCast';
        
        //add some info
        mediaInfo.contentType = info.contentType || this.MediaTypes.video;
        mediaInfo.metadata = info;
        
        //create new media request object
        var mediaRequest = new chrome.cast.media.LoadRequest(mediaInfo);
            
        return mediaRequest;
    };
    
    Cast.prototype.initCast = function initCast(){
        var that = this;
        
        //event for new session available
        var sessionListener = function(session){
            //sweet, I have a session
            that.session = session;
            privateGlobal.setAvailable(true);
            
            console.log('session listener', arguments);  
        };
        //event for receiver status
        var receiverListener = function(status){
            if (status === 'available'){
                //I can cast
                privateGlobal.events.trigger(that.Events.available);
            }
            else {
                //boo, I can't cast
                //TODO fire event -- no casting on this page
                //this is not permanent, as a device could become available at some point
            }

            console.log('receiver listener', arguments);
        };

        //cast connection
        var onInitSuccess = function(){
            console.log('on init success', arguments);
            
            //chromecast is available
            privateGlobal.setAvailable(true);
        };
        var onError = function(){
            console.log('cast on error', arguments);
        };

        //request a session for an app
        var sessionRequest = new chrome.cast.SessionRequest(that.appID);
        
        //configure the API
        var apiConfig = new chrome.cast.ApiConfig(sessionRequest, sessionListener, receiverListener);
        //initialize the chromecast
        chrome.cast.initialize(apiConfig, onInitSuccess, onError);
        
        return that;
    };
    
    /**
     * @description Initialize casting.
     */
    Cast.prototype.init = function init(applicationID){
        var that = this;
        
        //TODO fire an event that Cast is ready for init
        
        
        //set the appID, or use the one already assigned
        that.appID = applicationID || that.appID;
        
        //check if there is now a valid ID
        //stop if there isn't and wait for the user to set one
        //setting an ID will automatically finish initialization
        if (!that.appID) return that;
        
        //************************************
        // we already have an appID, continue
        //************************************
        
        console.log('casting available', arguments);
    
        return that.initCast();
    };
    
    /**
     * @description Generated media control callback functions
     * @param {string} command The command issued
     * @param {boolean} success Whether it is a `success` or `error` callback
     */
    var mediaControlCallbackGenerator = function(command, success){
        return function onMediaControl(ev){
            console.log('mediacontrol', ((success) ? 'success' : 'error'), command, arguments);
            privateGlobal.events.trigger(Cast.prototype.Events.mediaControl, command, ev);
        };  
    };
    
    /**
     * @description Creates the Media Control object
     * @constructor
     */
    var CastControl = function(){ };
    
    /**
     * @description Sends a play/resume command to the current media session
     */
    CastControl.prototype.play = function(){
        if (privateGlobal.media) 
            privateGlobal.media.play(null, 
                                     mediaControlCallbackGenerator('play', true), 
                                     mediaControlCallbackGenerator('play', false));
    };
    /**
     * @description Sends a pause command to the current media session
     */
    CastControl.prototype.pause = function(){
        if (privateGlobal.media) 
            privateGlobal.media.pause(null, 
                                      mediaControlCallbackGenerator('pause', true), 
                                      mediaControlCallbackGenerator('pause', false));
    };
    /**
     * @description Sends a stop command to the current media session
     * This is permanent, and no media will be available after this command
     */
    CastControl.prototype.stop = function(){
        if (privateGlobal.media) 
            privateGlobal.media.stop(null, 
                                     mediaControlCallbackGenerator('stop', true), 
                                     mediaControlCallbackGenerator('stop', false));
    };
    /**
     * @description Sends a seek command to the current media session
     * @param {number} seconds The time to seek to, in seconds
     */
    CastControl.prototype.seek = function(seconds){
        if (privateGlobal.media) {
            var seekRequest = new chrome.cast.media.SeekRequest();
            seekRequest.currentTime = seconds;
            
            privateGlobal.media.seek(seekRequest, 
                                     mediaControlCallbackGenerator('seek', true), 
                                     mediaControlCallbackGenerator('seek', false));
        }
    };
    /**
     * @description Gets the status of the current media.
     * @returns {string|null} status The status of the media. Return `null` if there is no media.
     */
    CastControl.prototype.status = function(){
        if (privateGlobal.media){
            return privateGlobal.media.playerState.toLowerCase();
        }
        else{
            return null;   
        }
    };
    /**
     * @description Gets or sets the current time of the video, in seconds. If passing in a number, it is an alias for `seek`.
     * @param {number} seconds [Optional] If seconds are passed in, this is an alias for `seek`.
     * @returns {number} time The current time in seconds.
     */
    CastControl.prototype.time = function(seconds){
        if (privateGlobal.media && seconds === undefined){
            return privateGlobal.media.currentTime;
        }
        else this.seek(seconds);
    };
    /**
     * @description Gets the duration of the currently playing media.
     * @returns {number|null} seconds The duration in seconds.
     */
    CastControl.prototype.duration = function(){
        if (privateGlobal.media){
            return privateGlobal.media.media.duration;
        }
        else return null;
    };
    
    Cast.prototype.control = new CastControl();
    
    /**
     * @description Subscribe to Chromecast events
     */
    Cast.prototype.on = function(name, callback){
        privateGlobal.events.on(name, callback);
        return this;
    };
    
    /**
     * @description Remove Chromecast event listeners
     */
    Cast.prototype.off = function(name, callback){
        privateGlobal.events.off(name, callback);
        return this;
    };
    
    /**
     * @description Subscribe to only the first instance of an event
     */
    Cast.prototype.once = function(name, callback){
        privateGlobal.events.once(name, callback);
        return this;
    };
    
    global.chromecast = new Cast();
    
    /*jslint ignore:start*/
    window['__onGCastApiAvailable'] = function(loaded, errorInfo) {
        if (loaded) {
            chromecast.init();
            privateGlobal.events.trigger(chromecast.Events.extensionLoaded);
        } else {
            console.log('cast err', errorInfo);
            
            //this is a permanent error
            //a page refresh is probably required
            var err = CastError(CastError.type.extensionError, null, true);
            privateGlobal.events.trigger(chromecast.Events.error, err);
        }
    };
    /*jslint ignore:end*/
}(this);

//insert Google Cast API
//!function(){
//    var head = document.head || document.getElementsByTagName('head')[0];
//    var scr = document.createElement('script');
//    scr.type = 'text/javscript';
//    scr.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js';
//    
//    //head.appendChild(scr);
//    document.body.appendChild(scr);
//    
//    console.log('inserted script');
//    
//    //<script type="text/javascript" src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js"></script>
//}();

//TODO dom stuff
