import React, { Component, PropTypes } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

export default class Drawer extends Component {

  // Define prop types
  static propTypes = {
    // Should the drawer be openable or not?
    isLocked: PropTypes.bool,
    // Pass messages to show as children
    children: PropTypes.any,
    // Whether the window is open or not
    isOpen: PropTypes.bool,
    // Callbacks for open & close events
    onOpen: PropTypes.func,
    onClosed: PropTypes.func,
    // Header that shows up on top the screen when opened
    header: PropTypes.string,
    // Header height
    headerHeight: PropTypes.number,
    // Header icon
    headerIcon: PropTypes.string,
    // Height of the visible teaser area at the bottom of the screen
    teaserHeight: PropTypes.number,
    // Offset from top, in addition to headerHeight, that drawer should open
    openMax: PropTypes.number,
  };

  // Set default prop values
  static defaultProps = {
    isLocked: false,
    isOpen: false,
    header: 'Messages',
    headerHeight: 70,
    teaserHeight: 75,
    openMax: 200,
    headerIcon: 'md-arrow-up',
  };

  // Define state
  state = {
    // Whether it's open or not
    open: false,
    // Whether the window is being pulled up/down or not
    pulling: false,
    // Zero means user haven't scrolled the content yet
    scrollOffset: 0,
    // Offset from top, in addition to headerHeight, that drawer should open
    openMax: 0,
  };

  // Configure animations
  config = {
    // Window position
    position: {
      // maximum possible value - the bottom edge of the screen
      max: height,
      // starting value - teaserHeight higher than the bottom of the screen
      start: height - this.props.teaserHeight,
      // end value - headerHeight lower than the top of the screen
      end: this.props.headerHeight + this.state.openMax,
      // minimal possible value - a bit lower the top of the screen
      min: this.props.headerHeight + (this.props.isLocked ? 250 : this.state.openMax),
      // When animated triggers these value updates
      animates: [
        () => this._animatedOpacity,
        () => this._animatedWidth
      ]
    },
    // Window width
    width: {
      end: width,         // takes full with once opened
      start: width - (typeof(this.props.shrinkMargin) === 'undefined' ? 20 : this.props.shrinkMargin),  // slightly narrower than screen when closed
    },
    // Window backdrop opacity
    opacity: {
      start: 0,   // fully transparent when closed
      end: 1      // not transparent once opened
    },
  };

  // Pan responder to handle gestures
  _panResponder = {};

  // Animates backdrop opacity
  _animatedOpacity = new Animated.Value(this.config.opacity.start);

  // Animates window width
  _animatedWidth = new Animated.Value(this.config.width.start);

  // Animates window position
  _animatedPosition = new Animated.Value(this.props.isOpen
    ? this.config.position.end
    : this.config.position.start);

  componentWillMount() {
    // Set current position
    this._currentPosition = this._animatedPosition._value;
    // Listen for this._animatedPosition changes
    this._animatedPosition.addListener((value) => {
      // Update _currentPosition
      this._currentPosition = value.value;
      // Animate depending values
      this.config.position.animates.map(item => {
        item().setValue(value.value);
      })
    });
    // Reset value once listener is registered to update depending animations
    this._animatedPosition.setValue(this._animatedPosition._value);
    // Initialize PanResponder to handle gestures
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: this._grantPanResponder,
      onStartShouldSetPanResponderCapture: this._grantPanResponder,
      onMoveShouldSetPanResponder: this._grantPanResponder,
      onMoveShouldSetPanResponderCapture: this._grantPanResponder,
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderRelease: this._handlePanResponderEnd,
      onPanResponderTerminate: this._handlePanResponderEnd,
      onShouldBlockNativeResponder: (evt, gestureState) => true,
    });
  }

  // Handle isOpen prop changes to either open or close the window
  componentWillReceiveProps(nextProps) {
    // update openMax
    if (nextProps.openMax) {
      this.setState({openMax: nextProps.openMax})
      this.config.position.end = this.props.headerHeight + nextProps.openMax
    }

    // isOpen prop changed to true from false
    if (!this.props.isOpen && nextProps.isOpen) {
      this.open();
    }
    // isOpen prop changed to false from true
    else if (this.props.isOpen && !nextProps.isOpen) {
      this.close();
    }
  }

  render() {
    const { children, header } = this.props,
      // Interpolate position value into opacity value
      animatedOpacity = this._animatedOpacity.interpolate({
        inputRange: [this.config.position.end, this.config.position.start],
        outputRange: [this.config.opacity.end, this.config.opacity.start],
      }),
      // Interpolate position value into width value
      animatedWidth = this._animatedWidth.interpolate({
        inputRange: [this.config.position.min,// top of the screen
          this.config.position.start - 50,    // 50 pixels higher than next point
          this.config.position.start,         // a bit higher than the bottom of the screen
          this.config.position.max            // the bottom of the screen
        ],
        outputRange: [this.config.width.end,  // keep max width after next point
          this.config.width.end,              // end: max width at 50 pixel higher
          this.config.width.start,            // start: min width at the bottom
          this.config.width.start             // keep min width before previous point
        ],
      });
    return (
      <Animated.View style={[styles.container, this.getContainerStyle()]}>
        {/* Use light status bar because we have dark background */}
        <StatusBar barStyle={"light-content"} />
        {/* Backdrop with animated opacity */}
        <Animated.View style={[styles.backdrop, { opacity: animatedOpacity }]}>
          {/* Close window when tapped on header */}
          <TouchableWithoutFeedback onPress={this.close}>
            <View style={[styles.header, this.getHeaderStyle()]}>
              {/* Icon */}
              <View style={styles.headerIcon}>
                <Icon name={this.props.headerIcon} size={24} color="white" />
              </View>
              {/* Header */}
              <View style={styles.headerTitle}>
                <Text style={styles.headerText}>{header}</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>
        {/* Content container */}
        <Animated.View
          style={[styles.content, {
            // Add padding at the bottom to fit all content on the screen
            paddingBottom: this.props.headerHeight,
            // Animate width
            // width: animatedWidth,
            width: this.config.width.start + 20,
            // Animate position on the screen
            transform: [{ translateY: this._animatedPosition }, { translateX: 0 }]
          }]}
          // Handle gestures
          {...this._panResponder.panHandlers}
        >
          {/* Put all content in a scrollable container */}
          <ScrollView
            ref={(scrollView) => { this._scrollView = scrollView; }}
            // Enable scrolling only when the window is open
            scrollEnabled={this.state.open}
            // Hide all scrolling indicators
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            // Trigger onScroll often
            scrollEventThrottle={16}
            onScroll={this._handleScroll}
          >
            {/* Render children components */}
            {children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    );
  }

  // Either allow or deny gesture handler
  _grantPanResponder = (evt, gestureState) => {
    // Allow if is not open & dragging
    if (!this.state.open && (this.pulledDown(gestureState) || this.pulledUp(gestureState))) {
      return true;
    }
    // Allow if user haven't scroll the content yet
    else if (this.pulledDown(gestureState) && this.state.scrollOffset <= 0) {
      return true;
    }
    // Allow if pulled down rapidly
    else if (this.pulledDown(gestureState) && this.pulledFast(gestureState)) {
      return true;
    }
    // Deny otherwise
    return false;
  };

  // Called when granted
  _handlePanResponderGrant = (evt, gestureState) => {
    // Update the state so we know we're in the middle of pulling it
    this.setState({ pulling: true });
    // Set offset and initialize with 0 so we update it
    // with relative values from gesture handler
    this._animatedPosition.setOffset(this._currentPosition);
    this._animatedPosition.setValue(0);
  };

  // Called when being pulled
  _handlePanResponderMove = (evt, gestureState) => {
    // Update position unless we go outside of allowed range
    if (this.insideAllowedRange()) {
      this._animatedPosition.setValue(gestureState.dy);
    }
  };

  // Called when gesture ended
  _handlePanResponderEnd = (evt, gestureState) => {
    // Reset offset
    this._animatedPosition.flattenOffset();
    // Reset pulling state
    this.setState({ pulling: false });
    // Pulled down and far enough to trigger close
    if (this.pulledDown(gestureState) && this.pulledFar(gestureState)) {
      return this.close();
    }
    // Pulled up and far enough to trigger open
    else if (!this.props.isLocked && this.pulledUp(gestureState) && this.pulledFar(gestureState)) {
      return this.open();
    }
    // Toggle if tapped
    else if (this.tapped(gestureState)) {
      return this.toggle();
    }
    // Restore back to appropriate position otherwise
    else {
      this.restore();
    }
  };

  // Handle content scrolling
  _handleScroll = event => {
    const { y } = event.nativeEvent.contentOffset;
    this.setState({ scrollOffset: y });
  };

  // Check if gesture was a tap
  tapped = (gestureState) => gestureState.dx === 0 && gestureState.dy === 0;

  // Check if pulled up
  pulledUp = (gestureState) => gestureState.dy < 0;

  // Check if pulled down
  pulledDown = (gestureState) => gestureState.dy > 0;

  // Check if pulled rapidly
  pulledFast = (gestureState) => Math.abs(gestureState.vy) > 0.75;

  // Check if pulled far
  pulledFar = (gestureState) => Math.abs(gestureState.dy) > 150;

  // Check if current position is inside allowed range
  insideAllowedRange = () =>
    this._currentPosition >= this.config.position.min
    && this._currentPosition <= this.config.position.max;

  // Open up the window on full screen
  open = () => {
    this.setState({ open: true }, () => {
      Animated.timing(this._animatedPosition, {
        toValue: this.config.position.end,
        useNativeDriver: true,
        duration: 120,
      }).start();
    });
    if (this.props.onOpen) this.props.onOpen()
  };

  // Minimize window and keep a teaser at the bottom
  close = () => {
    setTimeout(_ => {
      Animated.timing(this._animatedPosition, {
        toValue: this.config.position.start,
        useNativeDriver: true,
        duration: 500,
      }).start(() => this.setState({
        open: false,
      }));
      if (this.props.onClose) this.props.onClose()
      setTimeout(_ => this._scrollView.scrollTo({ y: 0 }), 125)
    }, 10)}

  // Toggle window state between opened and closed
  toggle = () => {
    if (!this.state.open) {
      this.open();
    }
    else {
      this.close();
    }
  };

  // Either open or close depending on the state
  restore = () => {
    if (this.state.open) {
      this.open();
    }
    else {
      this.close();
    }
  };

  // Get header style
  getHeaderStyle = () => ({
    height: Platform.OS === 'ios'
      ? this.props.headerHeight
      : this.props.headerHeight - 40, // compensate for the status bar
  });

  // Get container style
  getContainerStyle = () => ({
    // Move the view below others if not open or moving
    // to not block gesture handlers on other views
    zIndex: this.state.pulling || this.state.open ? 1 : -1,
  });
}

const styles = StyleSheet.create({
  // Main container
  container: {
    ...StyleSheet.absoluteFillObject,   // fill up all screen
    alignItems: 'center',               // center children
    justifyContent: 'flex-end',         // align popup at the bottom
    backgroundColor: 'transparent',     // transparent background
  },
  // Semi-transparent background below popup
  backdrop: {
    ...StyleSheet.absoluteFillObject,   // fill up all screen
    alignItems: 'center',               // center children
    justifyContent: 'flex-start',       // align popup at the bottom
    backgroundColor: 'rgba(0,0,0,.6)',
  },
  // Body
  content: {
    backgroundColor: 'transparent',
    height: height,
  },
  // Header
  header: {
    flexDirection: 'row',               // arrange children in a row
    alignItems: 'center',               // center vertically
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,                            // take up all available space
  },
  headerText: {
    color: 'white',
    fontFamily: 'Avenir',
    fontWeight: '600',
    fontSize: 16,
  },
});
