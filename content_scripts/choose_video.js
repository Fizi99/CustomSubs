
(() => {

    console.log("running");
    if (window.hasRun) {
        return;
      }
    window.hasRun = true;

    browser.runtime.onMessage.addListener((message) => {
        if (message.command === "start_extension") {
          startExtension();
        }
      });

    var offset = 0;
    var yPosition = 70;
    var fontSize = 20;
    var showSubs = false;


    function startExtension(){
        const videolist = document.getElementsByTagName("video");
        var pickedVideo;
        var subtitleDOM;
        var srtFile;
        var subtitleText;
        var subtitleObjects;
        
    
        console.log(videolist.length);
    
        createOverlay();
    
        /**
         * Create the Overlay for videoselection and prepend it to the document
         */
        function createOverlay(){

            /**
             * only create the overlay once
             */
            if(document.getElementById("customSubsOverlay")){
                document.getElementById("customSubsOverlay").classList.remove("hidden");
                return;
            }

            console.log("create overlay");

            createStyleSheet();

            const overlay = document.createElement("div");
            overlay.id = "customSubsOverlay";

            const contentContainer = document.createElement("div");
            contentContainer.id = "contentContainer";
          

            // add dom elements to overlay
            overlay.appendChild(closeButton(overlay));

            contentContainer.appendChild(videoSelector());
            contentContainer.appendChild(fileSelector());
            contentContainer.appendChild(offsetSelector());
            contentContainer.appendChild(yPositionSelector());
            contentContainer.appendChild(fontSizeSelector());
            contentContainer.appendChild(toggleSubtitlesButton());

            overlay.appendChild(contentContainer);

            // display overlay
            document.body.prepend(overlay);

        }

        /**
         * Add style for the overlay
         */
        function createStyleSheet(){
            const styles = `
            #customSubsOverlay { 
                background-color: #7e7e7ea6;
                z-index: 2147483647;
                position: fixed;
                color: black;
                right: 20px;
                top: 20px;
                padding: 20px;
                font-size: 20px;
            }

            #contentContainer {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                top: 40%;
                position: relative;
                gap: 25px;
                padding-top: 15px;
            }

        
            .videoSelector {
                display: flex;
                flex-direction: column;
            }

            .description {

            }

            .contentWrapper {
                display: flex;
            }
    
            .hidden {
                display: none;
            }
    
            .subtitle {
                position: absolute;
                text-align: center;
                margin: auto;
                width: 100%;
            }
            `
            const styleSheet = document.createElement("style");
            styleSheet.innerHTML = styles;
            document.body.appendChild(styleSheet);
        }

        function closeButton(overlay){
            // close button
            const closeButton = document.createElement("button");
            closeButton.innerHTML = "close";
            closeButton.addEventListener("click", () => {
                overlay.classList.add("hidden");
            });

            return closeButton;
        }

        function toggleSubtitlesButton(){
            
            const toggleSubtitles = document.createElement("button");
            toggleSubtitles.innerHTML = "toggle Subtitles";
            toggleSubtitles.addEventListener("click", () => {
                if(showSubs === true){
                    showSubs = false;
                    let subtitles = document.getElementsByClassName("subtitle");
    
                    for(let i = 0; i < subtitles.length; i++){
                        subtitles[i].remove();
                    
                    }
                }else{
                    showSubs = true;
                    createSubtitles();
                }
            });

            return toggleSubtitles;
        }

        function fileSelector(){

            const contentWrapper = document.createElement("div");
            const description = document.createElement("div");
            description.innerHTML = "Select a srt File: "
            description.classList.add("description");
            contentWrapper.classList.add("contentWrapper");

            const fileSelector = document.createElement("input");
            fileSelector.type = "file";
            fileSelector.accept = ".srt";

            const reader = new FileReader();
            reader.addEventListener('load', (event) => {
                subtitleText = event.target.result;
                subtitleObjects = parseSrt(subtitleText);

            });

            fileSelector.addEventListener("change", (event) => {

                let lastIndex = fileSelector.files.length - 1;
                srtFile = fileSelector.files[lastIndex];
 
                reader.readAsText(srtFile);
            });

            contentWrapper.appendChild(description).appendChild(fileSelector);

            return contentWrapper;
        }

        function offsetSelector(){

            const contentWrapper = document.createElement("div");
            const description = document.createElement("div");
            description.innerHTML = "Offset in sec: "
            description.classList.add("description");
            contentWrapper.classList.add("contentWrapper");

            const offsetInput = document.createElement("input");
            offsetInput.type = "text";
            offsetInput.value = offset;

            offsetInput.addEventListener("change", () => {
                
                offset = Number(offsetInput.value * 1000);
            });

            contentWrapper.appendChild(description).appendChild(offsetInput);

            return contentWrapper;
        }

        function yPositionSelector(){

            const contentWrapper = document.createElement("div");
            const description = document.createElement("div");
            description.innerHTML = "Position of subtitles: "
            description.classList.add("description");
            contentWrapper.classList.add("contentWrapper");

            const yPosInput = document.createElement("input");
            yPosInput.type = "text";
            yPosInput.value = yPosition;

            yPosInput.addEventListener("change", () => {
                
                yPosition = Number(yPosInput.value);
            });

            contentWrapper.appendChild(description).appendChild(yPosInput);

            return contentWrapper;
        }

        function fontSizeSelector(){

            const contentWrapper = document.createElement("div");
            const description = document.createElement("div");
            description.innerHTML = "Font size of subtitles: "
            description.classList.add("description");
            contentWrapper.classList.add("contentWrapper");

            const fontSizeInput = document.createElement("input");
            fontSizeInput.type = "text";
            fontSizeInput.value = fontSize;

            fontSizeInput.addEventListener("change", () => {
                
                fontSize = Number(fontSizeInput.value);
            });
            contentWrapper.appendChild(description).appendChild(fontSizeInput);

            return contentWrapper;
        }

        function videoSelector(){
            // choose video
            const videoSelector = document.createElement("div");
            videoSelector.classList.add("videoSelector");

            const description = document.createElement("div");
            description.innerHTML = "Select a video: "
            description.classList.add("description");

            videoSelector.appendChild(description);
    
            for(let i = 0; i < videolist.length; i++){
                let newButton = document.createElement("button");
                if(videolist[i].getAttribute("title") != null){
                    newButton.innerHTML = videolist[i].getAttribute("title");
                }else{
                    newButton.innerHTML = videolist[i].getAttribute("src");
                }
                newButton.addEventListener("click", () => {
                    pickedVideo = videolist[i];
                });
                
                videoSelector.appendChild(newButton);
            }

            return videoSelector;
        }

        function setSubtitleText(text, subtitle){
            subtitle.innerHTML = text;
        }

        /**
         * 
         * @param {the subtitle dom object} subtitle 
         * @param {the video dom object} video 
         * @param {the parsed subtitles} subtitleObjects 
         */
        function listenForSubtitleUpdate(subtitle, video, subtitleObjects){

            video.addEventListener("timeupdate", (event)=>{
                var subtitleSet = false;

                // check what subtitle should be displayed
                for(let i = 0; i<subtitleObjects.length; i++){
                    if((video.currentTime * 1000 + offset) > subtitleObjects[i].startTime && (video.currentTime * 1000 + offset) < subtitleObjects[i].endTime){
                        setSubtitleText(subtitleObjects[i].text, subtitle);
                        console.log(subtitleObjects[i].text);
                        subtitleSet = true;
                        break;
                    }
                }

                if(!subtitleSet){
                    setSubtitleText("", subtitle);
                }

            });
        }

        /**
         * create subtitle DOM Element only when video is picked and no other subtitles exist
         */
        function createSubtitles(){

            let subtitles = document.getElementsByClassName("subtitle");

            // delete old subtitles
            if(subtitles.length>0){

                for(let i = 0; i < subtitles.length; i++){
                    subtitles[i].remove();
                }
            }

            // create subtitle and position relative to video
            if(pickedVideo!= null && subtitleObjects != null){
                console.log("subtitles");
                subtitleDOM = document.createElement("div");
                subtitleDOM.innerHTML = "";
                subtitleDOM.classList.add("subtitle");
                subtitleDOM.style.fontSize = fontSize + "px";
                
                positionSubtitles(subtitleDOM, pickedVideo);

                let parent = pickedVideo.parentElement;
                parent.appendChild(subtitleDOM);

                const observer = new ResizeObserver((entries) => {
                    positionSubtitles(subtitleDOM, pickedVideo);
                });

                observer.observe(pickedVideo);
                listenForSubtitleUpdate(subtitleDOM, pickedVideo, subtitleObjects);
            }
        }

        /**
         * correctly position the subtitles
         */
        function positionSubtitles(subtitle, video){
            let rect = video.getBoundingClientRect();
            subtitle.style.top = ((rect.height/100)*yPosition)+"px";
        }

    }

    /**
         * parse a srt file
         */
    function parseSrt(text){
        var lineObjects = text.split("\r\n\r\n");

        const subtitleObjects = [];

        for(let i = 0; i<lineObjects.length; i++){

            var lines = lineObjects[i].split("\r\n");
            if(lines.length < 3){
                break;
            }
            let index = lines[0];
            let time = lines[1].split(" --> ");

            let subtitle = lines.slice(2, lines.length);
            let subtitleLines = "";

            let startTime = Number(time[0].split(':')[0]) * 60 * 60 * 1000
            + Number(time[0].split(':')[1]) * 60 * 1000
            + Number(time[0].split(':')[2].split(",")[0]) * 1000
            + Number(time[0].split(':')[2].split(",")[1]);

            let endTime = Number(time[1].split(':')[0]) * 60 * 60 * 1000
            + Number(time[1].split(':')[1]) * 60 * 1000
            + Number(time[1].split(':')[2].split(",")[0]) * 1000
            + Number(time[1].split(':')[2].split(",")[1]);

            for(let j = 0; j < subtitle.length; j++){
                if(j === subtitle.length-1){
                    subtitleLines = subtitleLines + subtitle[j];
                }else{
                    subtitleLines = subtitleLines + subtitle[j] + "<br>";
                }
            }

            subtitleObjects.push(new SubtitleObject(index, startTime, endTime, subtitleLines));
        }

        return subtitleObjects;
    }

    class SubtitleObject{
        
        constructor(index, startTime, endTime, text){
            this.index = index;
            this.startTime = startTime;
            this.endTime = endTime;
            this.text = text;
        }  
    }
})();