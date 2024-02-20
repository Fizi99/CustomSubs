
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
            if(document.getElementById("overlay")){
                document.getElementById("overlay").classList.remove("hidden");
                document.getElementById("overlay").appendChild(chooseVideoPopup());
                return;
            }

            createStyleSheet();

            const overlay = document.createElement("div");
            overlay.id = "overlay"

            // close button
            const exitButton = document.createElement("button");
            exitButton.innerHTML = "close";
            exitButton.addEventListener("click", () => {
                // create subtitles when overlay is closed
                createSubtitles();
                overlay.classList.add("hidden");
            });


            // file upload
            const fileUpload = document.createElement("input");
            fileUpload.type = "file";
            fileUpload.accept = ".srt";

            const reader = new FileReader();
            reader.addEventListener('load', (event) => {
                subtitleText = event.target.result;
                subtitleObjects = parseSrt(subtitleText);

            });

            fileUpload.addEventListener("change", (event) => {

                let lastIndex = fileUpload.files.length - 1;
                srtFile = fileUpload.files[lastIndex];
 
                reader.readAsText(srtFile);
            });

            // add dom elements to overlay
            overlay.appendChild(exitButton);
            overlay.appendChild(chooseVideoPopup());
            overlay.appendChild(fileUpload);
            overlay.appendChild(chooseOffset());

            // display overlay
            document.body.prepend(overlay);

        }

        /**
         * Add style for the overlay
         */
        function createStyleSheet(){
            const styles = `
            #overlay { 
                background-color: #7e7e7ea6;
                z-index: 2147483647;
                position: fixed;
                width: 100%;
                height: 100%;
            }
        
            .popup-content {
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

        function chooseOffset(){
            const offsetInput = document.createElement("input");
            offsetInput.type = "text";
            offsetInput.value = offset;

            offsetInput.addEventListener("change", () => {
                
                offset = Number(offsetInput.value * 1000);
                console.log(offset);
            });

            return offsetInput;
        }

        function chooseVideoPopup(){
            // choose video
            const popupContent = document.createElement("div");
            popupContent.classList.add("popup-content");
    
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
                
                popupContent.appendChild(newButton);
            }

            return popupContent;
        }

        function setSubtitleText(text, subtitle){
            subtitle.innerHTML = text;
        }

        function listenForSubtitleUpdate(subtitle, video, subtitleObjects){

            video.addEventListener("timeupdate", (event)=>{
                var subtitleSet = false;

                // check what subtitle should be displayed
                for(let i = 0; i<subtitleObjects.length; i++){
                    if((video.currentTime * 1000 + offset) > subtitleObjects[i].startTime && (video.currentTime * 1000 + offset) < subtitleObjects[i].endTime){
                        setSubtitleText(subtitleObjects[i].text, subtitle);
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
                subtitleDOM.innerHTML = "SUBTITLE";
                subtitleDOM.classList.add("subtitle");
                
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
            subtitle.style.top = ((rect.height/100)*70)+"px";
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
                    subtitleLines = subtitleLines + subtitle[j] + "\r\n";
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