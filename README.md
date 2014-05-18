# Friendly Cast


## Disclaimer

In similarity with Google, this API wrapper is a developer preview. It was made in only a few hours, after spending an entire frustrating day trying to work with the official API. I am actively breaking this right now, as you read this. Don't worry, it will be stable soon

The events and errors need more work, as I am not certain what they all mean at the moment. Further, I will need to do a bit more work to fully support custom receivers.

If you are a Chromecast veteran, or have any ideas or request, feel free to submit a issue or pull request, or contact me on [Google+](https://www.google.com/+KirilVatev).

## How to use it

Load both this library and the official Google Cast API, as such

    <script src="chromecast.js"></script>
    <script type="text/javascript" src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js"></script>

No more waiting for the Cast API to be ready/initialize/etc. After the scripts are loaded, you are ready to go. The Friendly Cast wrapper will handle the hard work of initializing everything. To start, provide your `applicationID`, or leave it blank to use the default media player:

    chromecast.setAppId();
    
Yes, folks, it's that easy. When the user tells you which video to play, just provide the URL to the Friendly Cast wrapper, and you are done:

    var urlString = 'http://server/path/to/video.mp4';
    chromecast.startCast(urlString);
    
## What next?

Sit tight for media controls, queues, etc.

## License

All code here is licensed under the MIT X11 License.