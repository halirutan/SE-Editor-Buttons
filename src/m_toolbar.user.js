// ==UserScript==
// @name          Mathematica Toolbar Buttons
// @author        Nathan Osman, Patrick Scheibe
// @version       1.4.5
// @downloadURL   https://github.com/halirutan/SE-Editor-Buttons/raw/master/src/m_toolbar.user.js
// @namespace     http://halirutan.de
// @description	  Adds some buttons to the editing toolbar to make it easy to insert links, unicode glyphs and shortcut keys.
// @include       https://mathematica.stackexchange.com/*
// @include       https://mathematica.meta.stackexchange.com/*
// @include       https://math.stackexchange.com/*
// ==/UserScript==

// This method injects code into the current page and executes it after the dependant scripts are loaded
function EmbedCodeOnPage(code) {

    var code_element = document.createElement('script');
    code_element.type = 'text/javascript';
    code_element.textContent = '(' + code + ')()';
    document.getElementsByTagName('head')[0].appendChild(code_element);

}

// This method call wraps the entire contents of the UserScript
EmbedCodeOnPage(function () {
    // Adds an array of buttons to the toolbar, being careful not to
    // stomp on any toes (clobber any existing buttons that are there)
    // The 'buttons' array contains one or more items that look like this:
    // { 'icon': url, 'tooltip': 'text to display' }
    // Each item must also contain either an array named 'menu' (to display a menu)
    // that contains items like: { 'text': 'item text', 'callback': function() { ... } }
    // or include 'callback' (a function to be called when the button is clicked)
    function AddToolbarButtons(toolbar, buttons) {

        // First, get the x-offset of the rightmost button in the toolbar
        var left = toolbar.find('li:not(.wmd-help-button):last').css('left');

        // Either we received the offset of the last button or the buttons haven't
        // been added to the toolbar yet, in which case we stick the spacer at offset 375
        if (left === null)
            left = 400;
        else
            left = parseInt(left.replace(/\D/g, '')) + 25;

        // Begin by adding a spacer at the calculated position
        //toolbar.append('<li class="wmd-spacer wmd-spacer-max" style="left: ' + left + 'px;"></li>');
        toolbar.append('<li class="wmd-spacer wmd-spacer-max"></li>');

        // Now add each of the buttons
        for (var i = 0; i < buttons.length; ++i) {

            var button = $('<li class="wmd-button" style="background-image: url(' + buttons[i]['icon'] +
                '); background-position: center; background-repeat: no-repeat; left: ' + (left += 25) +
                'px;" title="' + buttons[i]['tooltip'].replace('"', '&quot;') + '"></li>');

            if (typeof buttons[i]['callback'] == 'undefined') {

                // Create the list and populate it
                var ul = $('<ul style="background-color: #eee; border: 1px solid #aaa; display: none; list-style-type: none; margin: 0; position: absolute; top: 20px; width: 140px; z-index: 1;"></ul>');
                $.each(buttons[i]['menu'], function (key, item) {

                    var li = $('<li style="margin: 0; padding: 4px;">' + item['text'] + '</li>');
                    li.hover(function () {
                            $(this).css('background-color', '#ccc');
                        },
                        function () {
                            $(this).css('background-color', 'inherit');
                        });
                    li.click(item['callback']);
                    ul.append(li);

                });
                button.css('position', 'relative').append(ul);
                button.hover(function () {
                        ul.stop(true, true).slideDown('fast');
                    },
                    function () {
                        ul.stop(true, true).slideUp('fast');
                    });

            } else
                button.click(buttons[i]['callback']);

            toolbar.append(button);

        }
    }

    // Returns the start and end point of the selection in the editor
    function SelectionStartEnd(editor) {
        return [editor[0].selectionStart, editor[0].selectionEnd].sort(function (a, b) {  return a - b;  });
    }

    // Inserts the specified text at the current cursor position in the editor, replacing
    // the current selection (if any)
    function InsertIntoEditor(editor, text) {

        // Grab the current contents of the editor as well as the current selection
        var old_val = editor.val();
        var [s_start, s_end] = SelectionStartEnd(editor);

        // Splice the contents and insert the new text
        var new_val = old_val.substr(0, s_start) + text + old_val.substr(s_end);
        editor.val(new_val);

        // Set the focus to the editor and select the newly added text
        editor[0].focus();
        editor[0].selectionStart = s_start;
        editor[0].selectionEnd = s_start + text.length;

        // Refresh the preview
        StackExchange.MarkdownEditor.refreshAllPreviews();

    }

    //=====================
    //  UserScript Source
    //=====================

    // We only want to run the following code on certain pages, so
    // match the current page against this RegEx pattern
    // halirutan: The buttons will now appear when you edit a post in the review-queue
    if (location.pathname.match(/^\/(?:questions\/(?:ask|\d+)|review\/(?:close|first-posts|late-answers|low-quality-posts|reopen|suggested-edits)\/\d+|posts\/\d+\/edit|users\/edit|edit-tag-wiki)/) === null)
        return;
    
    // For each button row, inject our buttons into the toolbar
    // https://stackoverflow.com/a/16726669
    let observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (!mutation.addedNodes) return
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                let node = mutation.addedNodes[i];
                if (node.matches && node.matches('.wmd-button-row')) {
                    InjectButtons(node);
                }
            }
        })
    })

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });

    function InjectButtons(elm){        
        var button_row = $(elm);
        var editor = button_row.parent().parent().find('.wmd-input');

        // Asks the user the specified question and inserts the answer into the editor with the specified markdown
        function InsertMarkdown(question, markdown) {

            var answer = prompt(question);
            if (answer !== null)
                InsertIntoEditor(editor, markdown.replace(/#INPUT#/g, answer));

        }

        // I simply copied the logic from InsertIntoEditor() to create a function which either asks for input
        // or, if something is selected, uses the current selection as input. This is in my eyes a bit more usable
        // then always using a input dialog.
        function ReplaceMarkdown(question, markdown, preprocess) {

            // Grab the current contents of the editor as well as the current selection
            var old_val = editor.val();
            var [s_start, s_end] = SelectionStartEnd(editor);

            // shrink the selection if there are leading/trailing whitespaces
            s_start += old_val.substr(s_start, s_end - s_start).match(/^\s*/)[0].length;
            s_end -= old_val.substr(s_start, s_end - s_start).match(/\s*$/)[0].length;

            // Check whether text was selected and prompt the user for input if not.
            var answer;
            if (s_start == s_end) {
                answer = prompt(question);
            } else {
                answer = old_val.substr(s_start, s_end - s_start);
            }
            if (answer !== null && answer !== "") {

                if (preprocess !== undefined) {
                    answer = preprocess(answer)
                }

                var text = markdown.replace(/#INPUT#/g, answer);

                // Splice the contents and insert the new text
                var new_val = old_val.substr(0, s_start) + text + old_val.substr(s_end);
                editor.val(new_val);

                // Set the focus to the editor and select the newly added text
                editor[0].focus();
                editor[0].selectionStart = s_start;
                editor[0].selectionEnd = s_start + text.length;

                // Refresh the preview
                StackExchange.MarkdownEditor.refreshAllPreviews();
            }
        }

        // These are the glyphs we want to replace inside the markdown editor
        var rules = [
            ['\\\\\\[Aleph\\]', 'ℵ'],
            ['\\\\\\[Alpha\\]', 'α'],
            ['\\\\\\[And\\]', '∧'],
            ['\\\\\\[Angle\\]', '∠'],
            ['\\\\\\[Angstrom\\]', 'Å'],
            ['\\\\\\[AscendingEllipsis\\]', '⋰'],
            ['\\\\\\[Backslash\\]', '∖'],
            ['\\\\\\[BeamedEighthNote\\]', '♫'],
            ['\\\\\\[BeamedSixteenthNote\\]', '♬'],
            ['\\\\\\[Because\\]', '∵'],
            ['\\\\\\[Bet\\]', 'ℶ'],
            ['\\\\\\[Beta\\]', 'β'],
            ['\\\\\\[Bullet\\]', '•'],
            ['\\\\\\[CapitalAlpha\\]', 'Α'],
            ['\\\\\\[CapitalBeta\\]', 'Β'],
            ['\\\\\\[CapitalChi\\]', 'Χ'],
            ['\\\\\\[CapitalDelta\\]', 'Δ'],
            ['\\\\\\[CapitalDigamma\\]', 'Ϝ'],
            ['\\\\\\[CapitalEpsilon\\]', 'Ε'],
            ['\\\\\\[CapitalEta\\]', 'Η'],
            ['\\\\\\[CapitalGamma\\]', 'Γ'],
            ['\\\\\\[CapitalIota\\]', 'Ι'],
            ['\\\\\\[CapitalKappa\\]', 'Κ'],
            ['\\\\\\[CapitalKoppa\\]', 'Ϟ'],
            ['\\\\\\[CapitalLambda\\]', 'Λ'],
            ['\\\\\\[CapitalMu\\]', 'Μ'],
            ['\\\\\\[CapitalNu\\]', 'Ν'],
            ['\\\\\\[CapitalOmega\\]', 'Ω'],
            ['\\\\\\[CapitalOmicron\\]', 'Ο'],
            ['\\\\\\[CapitalPhi\\]', 'Φ'],
            ['\\\\\\[CapitalPi\\]', 'Π'],
            ['\\\\\\[CapitalPsi\\]', 'Ψ'],
            ['\\\\\\[CapitalRho\\]', 'Ρ'],
            ['\\\\\\[CapitalSampi\\]', 'Ϡ'],
            ['\\\\\\[CapitalSigma\\]', 'Σ'],
            ['\\\\\\[CapitalStigma\\]', 'Ϛ'],
            ['\\\\\\[CapitalTau\\]', 'Τ'],
            ['\\\\\\[CapitalTheta\\]', 'Θ'],
            ['\\\\\\[CapitalUpsilon\\]', 'Υ'],
            ['\\\\\\[CapitalXi\\]', 'Ξ'],
            ['\\\\\\[CapitalZeta\\]', 'Ζ'],
            ['\\\\\\[Cap\\]', '⌢'],
            ['\\\\\\[CenterDot\\]', '·'],
            ['\\\\\\[CenterEllipsis\\]', '⋯'],
            ['\\\\\\[Checkmark\\]', '✓'],
            ['\\\\\\[Chi\\]', 'χ'],
            ['\\\\\\[CircleDot\\]', '⊙'],
            ['\\\\\\[CircleMinus\\]', '⊖'],
            ['\\\\\\[CirclePlus\\]', '⊕'],
            ['\\\\\\[CircleTimes\\]', '⊗'],
            ['\\\\\\[ClockwiseContourIntegral\\]', '∲'],
            ['\\\\\\[CloseCurlyDoubleQuote\\]', '”'],
            ['\\\\\\[CloseCurlyQuote\\]', '’'],
            ['\\\\\\[CloverLeaf\\]', '⌘'],
            ['\\\\\\[ClubSuit\\]', '♣'],
            ['\\\\\\[Colon\\]', '∶'],
            ['\\\\\\[Congruent\\]', '≡'],
            ['\\\\\\[ContourIntegral\\]', '∮'],
            ['\\\\\\[Coproduct\\]', '∐'],
            ['\\\\\\[CounterClockwiseContourIntegral\\]', '∳'],
            ['\\\\\\[CupCap\\]', '≍'],
            ['\\\\\\[Cup\\]', '⌣'],
            ['\\\\\\[CurlyCapitalUpsilon\\]', 'ϒ'],
            ['\\\\\\[CurlyEpsilon\\]', 'ε'],
            ['\\\\\\[CurlyKappa\\]', 'ϰ'],
            ['\\\\\\[CurlyPhi\\]', 'φ'],
            ['\\\\\\[CurlyPi\\]', 'ϖ'],
            ['\\\\\\[CurlyRho\\]', 'ϱ'],
            ['\\\\\\[CurlyTheta\\]', 'ϑ'],
            ['\\\\\\[Dagger\\]', '†'],
            ['\\\\\\[Dalet\\]', 'ℸ'],
            ['\\\\\\[Dash\\]', '–'],
            ['\\\\\\[Degree\\]', '°'],
            ['\\\\\\[Del\\]', '∇'],
            ['\\\\\\[Delta\\]', 'δ'],
            ['\\\\\\[DescendingEllipsis\\]', '⋱'],
            ['\\\\\\[Diameter\\]', '⌀'],
            ['\\\\\\[Diamond\\]', '⋄'],
            ['\\\\\\[DiamondSuit\\]', '♢'],
            ['\\\\\\[Digamma\\]', 'ϝ'],
            ['\\\\\\[Divide\\]', '÷'],
            ['\\\\\\[DotEqual\\]', '≐'],
            ['\\\\\\[DoubleContourIntegral\\]', '∯'],
            ['\\\\\\[DoubleDagger\\]', '‡'],
            ['\\\\\\[DoubleDownArrow\\]', '⇓'],
            ['\\\\\\[DoubleLeftArrow\\]', '⇐'],
            ['\\\\\\[DoubleLeftRightArrow\\]', '⇔'],
            ['\\\\\\[DoubleLeftTee\\]', '⫤'],
            ['\\\\\\[DoubleLongLeftArrow\\]', '⟸'],
            ['\\\\\\[DoubleLongLeftRightArrow\\]', '⟺'],
            ['\\\\\\[DoubleLongRightArrow\\]', '⟹'],
            ['\\\\\\[DoublePrime\\]', '″'],
            ['\\\\\\[DoubleRightArrow\\]', '⇒'],
            ['\\\\\\[DoubleRightTee\\]', '⊨'],
            ['\\\\\\[DoubleUpArrow\\]', '⇑'],
            ['\\\\\\[DoubleUpDownArrow\\]', '⇕'],
            ['\\\\\\[DoubleVerticalBar\\]', '∥'],
            ['\\\\\\[DownArrowBar\\]', '⤓'],
            ['\\\\\\[DownArrow\\]', '↓'],
            ['\\\\\\[DownArrowUpArrow\\]', '⇵'],
            ['\\\\\\[DownLeftRightVector\\]', '⥐'],
            ['\\\\\\[DownLeftTeeVector\\]', '⥞'],
            ['\\\\\\[DownLeftVector\\]', '↽'],
            ['\\\\\\[DownLeftVectorBar\\]', '⥖'],
            ['\\\\\\[DownPointer\\]', '▾'],
            ['\\\\\\[DownRightTeeVector\\]', '⥟'],
            ['\\\\\\[DownRightVector\\]', '⇁'],
            ['\\\\\\[DownRightVectorBar\\]', '⥗'],
            ['\\\\\\[DownTeeArrow\\]', '↧'],
            ['\\\\\\[DownTee\\]', '⊤'],
            ['\\\\\\[Earth\\]', '♁'],
            ['\\\\\\[EighthNote\\]', '♪'],
            ['\\\\\\[Element\\]', '∈'],
            ['\\\\\\[Ellipsis\\]', '…'],
            ['\\\\\\[EmptyCircle\\]', '○'],
            ['\\\\\\[EmptyDiamond\\]', '◇'],
            ['\\\\\\[EmptyDownTriangle\\]', '▽'],
            ['\\\\\\[EmptyRectangle\\]', '▯'],
            ['\\\\\\[EmptySet\\]', '∅'],
            ['\\\\\\[EmptySmallCircle\\]', '◦'],
            ['\\\\\\[EmptySmallSquare\\]', '◻'],
            ['\\\\\\[EmptySquare\\]', '□'],
            ['\\\\\\[EmptyUpTriangle\\]', '△'],
            ['\\\\\\[EmptyVerySmallSquare\\]', '▫'],
            ['\\\\\\[Epsilon\\]', 'ϵ'],
            ['\\\\\\[EqualTilde\\]', '≂'],
            ['\\\\\\[Equilibrium\\]', '⇌'],
            ['\\\\\\[Equivalent\\]', '⧦'],
            ['\\\\\\[Eta\\]', 'η'],
            ['\\\\\\[Euro\\]', '€'],
            ['\\\\\\[Exists\\]', '∃'],
            ['\\\\\\[FilledCircle\\]', '●'],
            ['\\\\\\[FilledDiamond\\]', '◆'],
            ['\\\\\\[FilledDownTriangle\\]', '▼'],
            ['\\\\\\[FilledLeftTriangle\\]', '◀'],
            ['\\\\\\[FilledRectangle\\]', '▮'],
            ['\\\\\\[FilledRightTriangle\\]', '▶'],
            ['\\\\\\[FilledSmallSquare\\]', '◼'],
            ['\\\\\\[FilledSquare\\]', '■'],
            ['\\\\\\[FilledUpTriangle\\]', '▲'],
            ['\\\\\\[FilledVerySmallSquare\\]', '▪'],
            ['\\\\\\[FinalSigma\\]', 'ς'],
            ['\\\\\\[FivePointedStar\\]', '★'],
            ['\\\\\\[Flat\\]', '♭'],
            ['\\\\\\[ForAll\\]', '∀'],
            ['\\\\\\[Gamma\\]', 'γ'],
            ['\\\\\\[Gimel\\]', 'ℷ'],
            ['\\\\\\[GothicCapitalC\\]', 'ℭ'],
            ['\\\\\\[GothicCapitalH\\]', 'ℌ'],
            ['\\\\\\[GothicCapitalI\\]', 'ℑ'],
            ['\\\\\\[GothicCapitalR\\]', 'ℜ'],
            ['\\\\\\[GothicCapitalZ\\]', 'ℨ'],
            ['\\\\\\[GreaterEqualLess\\]', '⋛'],
            ['\\\\\\[GreaterEqual\\]', '≥'],
            ['\\\\\\[GreaterFullEqual\\]', '≧'],
            ['\\\\\\[GreaterGreater\\]', '≫'],
            ['\\\\\\[GreaterLess\\]', '≷'],
            ['\\\\\\[GreaterSlantEqual\\]', '⩾'],
            ['\\\\\\[GreaterTilde\\]', '≳'],
            ['\\\\\\[HappySmiley\\]', '☺'],
            ['\\\\\\[HBar\\]', 'ℏ'],
            ['\\\\\\[HeartSuit\\]', '♡'],
            ['\\\\\\[HorizontalLine\\]', '─'],
            ['\\\\\\[HumpDownHump\\]', '≎'],
            ['\\\\\\[HumpEqual\\]', '≏'],
            ['\\\\\\[Hyphen\\]', '‐'],
            ['\\\\\\[Infinity\\]', '∞'],
            ['\\\\\\[Integral\\]', '∫'],
            ['\\\\\\[Intersection\\]', '⋂'],
            ['\\\\\\[Iota\\]', 'ι'],
            ['\\\\\\[Jupiter\\]', '♃'],
            ['\\\\\\[Kappa\\]', 'κ'],
            ['\\\\\\[Koppa\\]', 'ϟ'],
            ['\\\\\\[Lambda\\]', 'λ'],
            ['\\\\\\[LeftAngleBracket\\]', '〈'],
            ['\\\\\\[LeftArrowBar\\]', '⇤'],
            ['\\\\\\[LeftArrow\\]', '←'],
            ['\\\\\\[LeftArrowRightArrow\\]', '⇆'],
            ['\\\\\\[LeftCeiling\\]', '⌈'],
            ['\\\\\\[LeftDoubleBracket\\]', '〚'],
            ['\\\\\\[LeftDownTeeVector\\]', '⥡'],
            ['\\\\\\[LeftDownVectorBar\\]', '⥙'],
            ['\\\\\\[LeftDownVector\\]', '⇃'],
            ['\\\\\\[LeftFloor\\]', '⌊'],
            ['\\\\\\[LeftPointer\\]', '◂'],
            ['\\\\\\[LeftRightArrow\\]', '↔'],
            ['\\\\\\[LeftRightVector\\]', '⥎'],
            ['\\\\\\[LeftTee\\]', '⊣'],
            ['\\\\\\[LeftTeeArrow\\]', '↤'],
            ['\\\\\\[LeftTeeVector\\]', '⥚'],
            ['\\\\\\[LeftTriangle\\]', '⊲'],
            ['\\\\\\[LeftTriangleBar\\]', '⧏'],
            ['\\\\\\[LeftTriangleEqual\\]', '⊴'],
            ['\\\\\\[LeftUpDownVector\\]', '⥑'],
            ['\\\\\\[LeftUpTeeVector\\]', '⥠'],
            ['\\\\\\[LeftUpVector\\]', '↿'],
            ['\\\\\\[LeftUpVectorBar\\]', '⥘'],
            ['\\\\\\[LeftVector\\]', '↼'],
            ['\\\\\\[LeftVectorBar\\]', '⥒'],
            ['\\\\\\[LessEqual\\]', '≤'],
            ['\\\\\\[LessEqualGreater\\]', '⋚'],
            ['\\\\\\[LessFullEqual\\]', '≦'],
            ['\\\\\\[LessGreater\\]', '≶'],
            ['\\\\\\[LessLess\\]', '≪'],
            ['\\\\\\[LessSlantEqual\\]', '⩽'],
            ['\\\\\\[LessTilde\\]', '≲'],
            ['\\\\\\[LongDash\\]', '—'],
            ['\\\\\\[LongLeftArrow\\]', '⟵'],
            ['\\\\\\[LongLeftRightArrow\\]', '⟷'],
            ['\\\\\\[LongRightArrow\\]', '⟶'],
            ['\\\\\\[LowerLeftArrow\\]', '↙'],
            ['\\\\\\[LowerRightArrow\\]', '↘'],
            ['\\\\\\[Mars\\]', '♂'],
            ['\\\\\\[MeasuredAngle\\]', '∡'],
            ['\\\\\\[Mercury\\]', '☿'],
            ['\\\\\\[Mho\\]', '℧'],
            ['\\\\\\[Micro\\]', 'µ'],
            ['\\\\\\[MinusPlus\\]', '∓'],
            ['\\\\\\[Mu\\]', 'μ'],
            ['\\\\\\[Nand\\]', '⊼'],
            ['\\\\\\[Natural\\]', '♮'],
            ['\\\\\\[Neptune\\]', '♆'],
            ['\\\\\\[NestedGreaterGreater\\]', '⪢'],
            ['\\\\\\[NestedLessLess\\]', '⪡'],
            ['\\\\\\[Nor\\]', '⊽'],
            ['\\\\\\[NotCongruent\\]', '≢'],
            ['\\\\\\[NotCupCap\\]', '≭'],
            ['\\\\\\[NotDoubleVerticalBar\\]', '∦'],
            ['\\\\\\[NotElement\\]', '∉'],
            ['\\\\\\[NotEqual\\]', '≠'],
            ['\\\\\\[NotExists\\]', '∄'],
            ['\\\\\\[NotGreater\\]', '≯'],
            ['\\\\\\[NotGreaterEqual\\]', '≱'],
            ['\\\\\\[NotGreaterFullEqual\\]', '≩'],
            ['\\\\\\[NotGreaterLess\\]', '≹'],
            ['\\\\\\[NotGreaterTilde\\]', '≵'],
            ['\\\\\\[NotLeftTriangle\\]', '⋪'],
            ['\\\\\\[NotLeftTriangleEqual\\]', '⋬'],
            ['\\\\\\[NotLessEqual\\]', '≰'],
            ['\\\\\\[NotLessFullEqual\\]', '≨'],
            ['\\\\\\[NotLessGreater\\]', '≸'],
            ['\\\\\\[NotLess\\]', '≮'],
            ['\\\\\\[NotLessTilde\\]', '≴'],
            ['\\\\\\[Not\\]', '¬'],
            ['\\\\\\[NotPrecedes\\]', '⊀'],
            ['\\\\\\[NotPrecedesSlantEqual\\]', '⋠'],
            ['\\\\\\[NotPrecedesTilde\\]', '⋨'],
            ['\\\\\\[NotReverseElement\\]', '∌'],
            ['\\\\\\[NotRightTriangle\\]', '⋫'],
            ['\\\\\\[NotRightTriangleEqual\\]', '⋭'],
            ['\\\\\\[NotSquareSubsetEqual\\]', '⋢'],
            ['\\\\\\[NotSquareSupersetEqual\\]', '⋣'],
            ['\\\\\\[NotSubset\\]', '⊄'],
            ['\\\\\\[NotSubsetEqual\\]', '⊈'],
            ['\\\\\\[NotSucceeds\\]', '⊁'],
            ['\\\\\\[NotSucceedsSlantEqual\\]', '⋡'],
            ['\\\\\\[NotSucceedsTilde\\]', '⋩'],
            ['\\\\\\[NotSuperset\\]', '⊅'],
            ['\\\\\\[NotSupersetEqual\\]', '⊉'],
            ['\\\\\\[NotTilde\\]', '≁'],
            ['\\\\\\[NotTildeEqual\\]', '≄'],
            ['\\\\\\[NotTildeFullEqual\\]', '≇'],
            ['\\\\\\[NotTildeTilde\\]', '≉'],
            ['\\\\\\[Nu\\]', 'ν'],
            ['\\\\\\[Omega\\]', 'ω'],
            ['\\\\\\[Omicron\\]', 'ο'],
            ['\\\\\\[OpenCurlyDoubleQuote\\]', '“'],
            ['\\\\\\[OpenCurlyQuote\\]', '‘'],
            ['\\\\\\[Or\\]', '∨'],
            ['\\\\\\[OverBracket\\]', '⎴'],
            ['\\\\\\[Paragraph\\]', '¶'],
            ['\\\\\\[PartialD\\]', '∂'],
            ['\\\\\\[Phi\\]', 'ϕ'],
            ['\\\\\\[Pi\\]', 'π'],
            ['\\\\\\[PlusMinus\\]', '±'],
            ['\\\\\\[Pluto\\]', '♇'],
            ['\\\\\\[Precedes\\]', '≺'],
            ['\\\\\\[PrecedesEqual\\]', '⪯'],
            ['\\\\\\[PrecedesSlantEqual\\]', '≼'],
            ['\\\\\\[PrecedesTilde\\]', '≾'],
            ['\\\\\\[Prime\\]', '′'],
            ['\\\\\\[Product\\]', '∏'],
            ['\\\\\\[Proportion\\]', '∷'],
            ['\\\\\\[Proportional\\]', '∝'],
            ['\\\\\\[Psi\\]', 'ψ'],
            ['\\\\\\[QuarterNote\\]', '♩'],
            ['\\\\\\[ReturnIndicator\\]', '↵'],
            ['\\\\\\[ReverseDoublePrime\\]', '‶'],
            ['\\\\\\[ReverseElement\\]', '∋'],
            ['\\\\\\[ReverseEquilibrium\\]', '⇋'],
            ['\\\\\\[ReversePrime\\]', '‵'],
            ['\\\\\\[ReverseUpEquilibrium\\]', '⥯'],
            ['\\\\\\[Rho\\]', 'ρ'],
            ['\\\\\\[RightAngle\\]', '∟'],
            ['\\\\\\[RightAngleBracket\\]', '〉'],
            ['\\\\\\[RightArrow\\]', '→'],
            ['\\\\\\[RightArrowBar\\]', '⇥'],
            ['\\\\\\[RightArrowLeftArrow\\]', '⇄'],
            ['\\\\\\[RightCeiling\\]', '⌉'],
            ['\\\\\\[RightDoubleBracket\\]', '〛'],
            ['\\\\\\[RightDownTeeVector\\]', '⥝'],
            ['\\\\\\[RightDownVector\\]', '⇂'],
            ['\\\\\\[RightDownVectorBar\\]', '⥕'],
            ['\\\\\\[RightFloor\\]', '⌋'],
            ['\\\\\\[RightPointer\\]', '▸'],
            ['\\\\\\[RightTee\\]', '⊢'],
            ['\\\\\\[RightTeeArrow\\]', '↦'],
            ['\\\\\\[RightTeeVector\\]', '⥛'],
            ['\\\\\\[RightTriangle\\]', '⊳'],
            ['\\\\\\[RightTriangleBar\\]', '⧐'],
            ['\\\\\\[RightTriangleEqual\\]', '⊵'],
            ['\\\\\\[RightUpDownVector\\]', '⥏'],
            ['\\\\\\[RightUpTeeVector\\]', '⥜'],
            ['\\\\\\[RightUpVector\\]', '↾'],
            ['\\\\\\[RightUpVectorBar\\]', '⥔'],
            ['\\\\\\[RightVector\\]', '⇀'],
            ['\\\\\\[RightVectorBar\\]', '⥓'],
            ['\\\\\\[RoundImplies\\]', '⥰'],
            ['\\\\\\[SadSmiley\\]', '☹'],
            ['\\\\\\[Sampi\\]', 'ϡ'],
            ['\\\\\\[Saturn\\]', '♄'],
            ['\\\\\\[ScriptCapitalB\\]', 'ℬ'],
            ['\\\\\\[ScriptCapitalE\\]', 'ℰ'],
            ['\\\\\\[ScriptCapitalF\\]', 'ℱ'],
            ['\\\\\\[ScriptCapitalH\\]', 'ℋ'],
            ['\\\\\\[ScriptCapitalI\\]', 'ℐ'],
            ['\\\\\\[ScriptCapitalL\\]', 'ℒ'],
            ['\\\\\\[ScriptCapitalM\\]', 'ℳ'],
            ['\\\\\\[ScriptCapitalR\\]', 'ℛ'],
            ['\\\\\\[ScriptE\\]', 'ℯ'],
            ['\\\\\\[ScriptG\\]', 'ℊ'],
            ['\\\\\\[ScriptL\\]', 'ℓ'],
            ['\\\\\\[ScriptO\\]', 'ℴ'],
            ['\\\\\\[Sharp\\]', '♯'],
            ['\\\\\\[Sigma\\]', 'σ'],
            ['\\\\\\[SixPointedStar\\]', '✶'],
            ['\\\\\\[SkeletonIndicator\\]', '⁃'],
            ['\\\\\\[SmallCircle\\]', '∘'],
            ['\\\\\\[SpaceIndicator\\]', '␣'],
            ['\\\\\\[SpadeSuit\\]', '♠'],
            ['\\\\\\[SphericalAngle\\]', '∢'],
            ['\\\\\\[Sqrt\\]', '√'],
            ['\\\\\\[SquareIntersection\\]', '⊓'],
            ['\\\\\\[SquareSubset\\]', '⊏'],
            ['\\\\\\[SquareSubsetEqual\\]', '⊑'],
            ['\\\\\\[SquareSuperset\\]', '⊐'],
            ['\\\\\\[SquareSupersetEqual\\]', '⊒'],
            ['\\\\\\[SquareUnion\\]', '⊔'],
            ['\\\\\\[Star\\]', '⋆'],
            ['\\\\\\[Stigma\\]', 'ϛ'],
            ['\\\\\\[Subset\\]', '⊂'],
            ['\\\\\\[SubsetEqual\\]', '⊆'],
            ['\\\\\\[Succeeds\\]', '≻'],
            ['\\\\\\[SucceedsEqual\\]', '⪰'],
            ['\\\\\\[SucceedsSlantEqual\\]', '≽'],
            ['\\\\\\[SucceedsTilde\\]', '≿'],
            ['\\\\\\[SuchThat\\]', '∍'],
            ['\\\\\\[Sum\\]', '∑'],
            ['\\\\\\[Superset\\]', '⊃'],
            ['\\\\\\[SupersetEqual\\]', '⊇'],
            ['\\\\\\[Tau\\]', 'τ'],
            ['\\\\\\[Therefore\\]', '∴'],
            ['\\\\\\[Theta\\]', 'θ'],
            ['\\\\\\[Tilde\\]', '∼'],
            ['\\\\\\[TildeEqual\\]', '≃'],
            ['\\\\\\[TildeFullEqual\\]', '≅'],
            ['\\\\\\[TildeTilde\\]', '≈'],
            ['\\\\\\[Times\\]', '×'],
            ['\\\\\\[Trademark\\]', '™'],
            ['\\\\\\[UnderBracket\\]', '⎵'],
            ['\\\\\\[Union\\]', '⋃'],
            ['\\\\\\[UnionPlus\\]', '⊎'],
            ['\\\\\\[UpArrow\\]', '↑'],
            ['\\\\\\[UpArrowBar\\]', '⤒'],
            ['\\\\\\[UpArrowDownArrow\\]', '⇅'],
            ['\\\\\\[UpDownArrow\\]', '↕'],
            ['\\\\\\[UpEquilibrium\\]', '⥮'],
            ['\\\\\\[UpperLeftArrow\\]', '↖'],
            ['\\\\\\[UpperRightArrow\\]', '↗'],
            ['\\\\\\[UpPointer\\]', '▴'],
            ['\\\\\\[Upsilon\\]', 'υ'],
            ['\\\\\\[UpTee\\]', '⊥'],
            ['\\\\\\[UpTeeArrow\\]', '↥'],
            ['\\\\\\[Uranus\\]', '♅'],
            ['\\\\\\[Vee\\]', '⋁'],
            ['\\\\\\[Venus\\]', '♀'],
            ['\\\\\\[VerticalEllipsis\\]', '⋮'],
            ['\\\\\\[VerticalLine\\]', '│'],
            ['\\\\\\[VerticalTilde\\]', '≀'],
            ['\\\\\\[WatchIcon\\]', '⌚'],
            ['\\\\\\[Wedge\\]', '⋀'],
            ['\\\\\\[WeierstrassP\\]', '℘'],
            ['\\\\\\[Xi\\]', 'ξ'],
            ['\\\\\\[Xor\\]', '⊻'],
            ['\\\\\\[Zeta\\]', 'ζ']
        ];

        // This function works exclusively on selected text regions
        function ReplaceGlyphs() {

            // Grab the current contents of the editor as well as the current selection
            var old_val = editor.val();
            var [s_start, s_end] = SelectionStartEnd(editor);

            if (s_start !== s_end) {

                var text = old_val.substr(s_start, s_end - s_start);

                // iterate through the
                for (var iter = 0; iter < rules.length; iter++) {
                    text = text.replace(new RegExp(rules[iter][0], 'gi'), rules[iter][1]);
                }

                // Splice the contents and insert the new text
                var new_val = old_val.substr(0, s_start) + text + old_val.substr(s_end);
                editor.val(new_val);

                // Set the focus to the editor and select the newly added text
                editor[0].focus();
                editor[0].selectionStart = s_start;
                editor[0].selectionEnd = s_start + text.length;

                // Refresh the preview
                StackExchange.MarkdownEditor.refreshAllPreviews();
            }


        }

        function ReplaceInOut() {
            var old_val = editor.val();
            var [s_start, s_end] = SelectionStartEnd(editor);

            if (s_start !== s_end) {

                var orig = old_val.substr(s_start, s_end - s_start);

                // A simple-minded In/Out parser that indents unindented input
                // Iterates through matches of In/Out prompt and tries to
                // keep track of current state.

                // Unindent
                if (/^(?:[ ]{4}[^\n]*[\n]?)+$/.test(orig)) {
                    orig = orig.replace(/^[ ]{4}([^\n]*)$/gm, "\$1");
                }

                var text = "";
                var inoutregex = /(In\[\d+\]:=[ \n]|Out\[\d+\](?:\/\/(?:(?:Standard|Full|Input|Output|Traditional|TeX|MathMLTree|Scientific|Engineering|Accounting)Form|Short|Shallow))?=[ \n]|During evaluation of In\[\d+\]:=[ \n])/g;
                var state = "I", type, last = 0, hasMore = true;
                while (hasMore) {
                    if ((match = inoutregex.exec(orig))) {
                        text += orig.slice(last, match.index);
                        last = inoutregex.lastIndex;
                        type = match[0].substr(0, 1);

                        if ((type == "D")) {
                            type = "O";
                        }

                        // End Output cell
                        if ((state == "O")) {
                            // Avoid having *) on its own line
                            // Note that the newlines get stripped if next state is output
                            text = text.replace(/[\s]*$/, " *)\n\n");
                        }

                        // Start Output cell
                        if ((type == "O")) {
                            // Avoid empty line preceeding "(*"
                            // for instance when selectig cell group
                            // and copying with "edit -> copy -> copy as input text"
                            text = text.replace(/[\n]*$/, "\n(* ");
                        }

                        state = type;
                    } else {
                        hasMore = false;
                    }
                }
                text += orig.substr(last);
                if ((state == "O")) {
                    text = text.replace(/[\s]*$/, " *)");
                }

                // Indent
                text = text.replace(/^(.*)$/gm, "    \$1");

                // iterate through the glyphs too
                for (var iter = 0; iter < rules.length; iter++) {
                    text = text.replace(new RegExp(rules[iter][0], 'gi'), rules[iter][1]);
                }

                var new_val = old_val.substr(0, s_start) + text + old_val.substr(s_end);
                editor.val(new_val);

                // Set the focus to the editor and select the newly added text
                editor[0].focus();
                editor[0].selectionStart = s_start;
                editor[0].selectionEnd = s_start + text.length;

                // Refresh the preview
                StackExchange.MarkdownEditor.refreshAllPreviews();

            }
        }

        // Again, the same logic as in InsertIntoEditor() to create a function which either asks for input
        // or, if something is selected, uses the current selection as input. This is in my eyes a bit more usable
        // then always using a input dialog.
        function InsertShortcut() {

            // Grab the current contents of the editor as well as the current selection
            var old_val = editor.val();
            var [s_start, s_end] = SelectionStartEnd(editor);

            // Check whether text was selected and prompt the user for input if not.
            var answer;
            if (s_start == s_end) {
                answer = prompt("Insert keys space separated like \"Ctrl Alt C\"");
            } else {
                answer = old_val.substr(s_start, s_end-s_start);
            }

            if (answer !== null && answer !== "") {

                var keys = answer.split(" ");

                var text = "";
                for (var i = 0; i < keys.length; i++) {
                    if (i !== 0) {
                        text += "+";
                    }
                    text += "<kbd>" + keys[i] + "</kbd>";
                }

                // Splice the contents and insert the new text
                var new_val = old_val.substr(0, s_start) + text + old_val.substr(s_end);
                editor.val(new_val);

                // Set the focus to the editor and select the newly added text
                editor[0].focus();
                editor[0].selectionStart = s_start;
                editor[0].selectionEnd = s_start + text.length;

                // Refresh the preview
                StackExchange.MarkdownEditor.refreshAllPreviews();

            }
        }

        var buttons = [

            // This is the button to create automatically inline code which is linked to the Wolfram doc.
            // This does not work for all functions!
            {
                'icon': 'https://i.stack.imgur.com/Jyeyd.png',
                'tooltip': 'Create a link to Wolfram online documentation.',
                'callback': function () {

                    ReplaceMarkdown(
                        'Mathematica Function (like Integrate, Plot, ..)',
                        '[`#INPUT#`](https://reference.wolfram.com/language/ref/#INPUT#.html)',
                        function (answer) {
                            return answer.trim().replace(/^`(.*)`$/g, "\$1");
                        })

                }
            },


            // Button to replace Mathematica greek characters in selected text.
            {
                'icon': 'https://i.stack.imgur.com/UAgo2.png',
                'tooltip': 'Replace symbol forms like \\[Alpha] with unicode glyphs in selected text.',
                'callback': function () {

                    ReplaceGlyphs();

                }
            },

            // Button to format In[1]:= .. code
            {
                'icon': 'https://i.stack.imgur.com/1drB7.png',
                'tooltip': 'Removes In[1]:= .. marks and replace glyphs in selected text.',
                'callback': function () {

                    ReplaceInOut();

                }
            },


            // Button to insert nicely rendered shortcut keys
            {
                'icon': 'https://i.stack.imgur.com/W9yah.png',
                'tooltip': 'Create nicely rendered keyboard shortcuts.',
                'callback': function () {

                    InsertShortcut();

                }
            }
        ];

        AddToolbarButtons(button_row, buttons);

    }
});
