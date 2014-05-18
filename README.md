# Friendly Cast


## Disclaimer

In similarity with Google, this API wrapper is a developer preview. It was made in only a few hours, after spending an entire frustrating day trying to work with the official API. I am actively breaking this right now, as you read this. Don't worry, it will be stable soon

The events and errors need more work, as I am not certain what they all mean at the moment. Further, I will need to do a bit more work to fully support custom receivers.

If you are a Chromecast veteran, or have any ideas or request, feel free to submit a issue or pull request, or contact me on [Google+](https://www.google.com/+KirilVatev).

## How to use it

Load both this library and the official Google Cast API, as such

    <script src="chromecast.js"></script>
    <script type="text/javascript" src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js"></script>

No more waiting for the Cast API to be ready/initialize/etc. After the scripts are loaded, you are ready to go. The Friendly Cast wrapper will handle the hard work of initializing everything. To start, provide your `applicationID` if you have a [registered receiver](https://developers.google.com/cast/docs/registration), or leave it blank to use the default media player:

    chromecast.setAppId();
    
    // OR
    
    var applicationID = 'xxxxxxxxxxxxxxxxxxxxxxx';
    chromecast.setAppId(applicationID);
    
Yes, folks, it's that easy. When the user tells you which video to play, just provide the URL to the Friendly Cast wrapper, and you are done:

    var urlString = 'http://server/path/to/video.mp4';
    chromecast.startCast(urlString);

## Events

Rather than providing a million callback functions every step of the way, Friendly Cast emits events using a familiar on/off system.

    chromecast.on('available', function(){
        var urlString = 'http://server/path/to/video.mp4';
        chromecast.startCast(urlString);
    });
    
To remove and event, pass in the name and original function:

    var doSomething = function(){ ... };
    
    //subscribe to an event
    chromecast.on('available', doSomething);
    
    //unsubscribe to the event
    chromecast.off('available', doSomething);
    
    //subscribe and fire only once
    chromecast.once('available', doSomething);
    
To find out all of the available events, you can check out the `chromecast.Events` enumerable in the Chrome console. I also suggest you use this enumerable to subscribe to events:

    chromecast.on(chromecast.Events.ready, function(){
        //the Google Cast API is available
    });
    
More documentation will come on events as I have it.

## Errors

The Google Cast API has quite a few errors it provides. I have standardized them all under teh `error` event:

    chromecast.on(chromecast.Events.error, function(err){
        err.message; // corresponds to the closest equivalent name of the Google Cast API
        err.permanent; //if this is true, Google Cast has had a permanent error, requiring a page refresh
        err.args; //this is the original error arguments as provided by the Google Cast API
    });
    
More documentation will come on errors as I have it.

## What next?

Sit tight for media controls, queues, etc. In the meantime, you can still use the regular Google Cast API to continue, or use the `chromecast.session` object to access the current session.

## License

All code here is licensed under the MIT X11 License.