import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { changeCurrentTime, changeSong, toggleIsPlaying } from '../actions/PlayerActions';
import Playlist from '../components/Playlist';
import Popover from '../components/Popover';
import SongDetails from '../components/SongDetails';
import { CHANGE_TYPES } from '../constants/SongConstants';
import { formatSeconds, formatStreamUrl } from '../utils/FormatUtils';
import { offsetLeft } from '../utils/MouseUtils';
import { getImageUrl } from '../utils/SongUtils';
import LocalStorageUtils from '../utils/LocalStorageUtils';

const propTypes = {
  dispatch: PropTypes.func.isRequired,
  player: PropTypes.object.isRequired,
  playingSongId: PropTypes.number,
  playlists: PropTypes.object.isRequired,
  song: PropTypes.object,
  songs: PropTypes.object.isRequired,
  users: PropTypes.object.isRequired,
};

class Player extends Component {
  constructor(props) {
    super(props);
    this.changeSong = this.changeSong.bind(this);
    this.changeVolume = this.changeVolume.bind(this);
    this.handleEnded = this.handleEnded.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleLoadedMetadata = this.handleLoadedMetadata.bind(this);
    this.handleLoadStart = this.handleLoadStart.bind(this);
    this.handleSeekMouseDown = this.handleSeekMouseDown.bind(this);
    this.handleSeekMouseMove = this.handleSeekMouseMove.bind(this);
    this.handleSeekMouseUp = this.handleSeekMouseUp.bind(this);
    this.handleVolumeMouseDown = this.handleVolumeMouseDown.bind(this);
    this.handleVolumeMouseMove = this.handleVolumeMouseMove.bind(this);
    this.handleVolumeMouseUp = this.handleVolumeMouseUp.bind(this);
    this.handlePlay = this.handlePlay.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
    this.handleVolumeChange = this.handleVolumeChange.bind(this);

    this.seek = this.seek.bind(this);
    this.toggleMute = this.toggleMute.bind(this);
    this.togglePlay = this.togglePlay.bind(this);
    this.toggleRepeat = this.toggleRepeat.bind(this);
    this.toggleShuffle = this.toggleShuffle.bind(this);

    const previousVolumeLevel = Number.parseFloat(LocalStorageUtils.get('volume'));
    this.state = {
      activePlaylistIndex: null,
      currentTime: 0,
      duration: 0,
      isSeeking: false,
      muted: false,
      repeat: false,
      shuffle: false,
      volume: previousVolumeLevel || 1,
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
    const audioElement = this.audio;
    audioElement.volume = this.state.volume;
    audioElement.play();
  }

  componentWillReceiveProps(nextProps) {
    const audioElement = this.audio;
    if (nextProps.player.isPlaying !== this.props.player.isPlaying) {
      if (nextProps.player.isPlaying) {
        audioElement.play();
      } else {
        audioElement.pause();
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.playingSongId && prevProps.playingSongId === this.props.playingSongId) {
      return;
    }

    this.audio.play();
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown, false);
  }

  bindSeekMouseEvents() {
    document.addEventListener('mousemove', this.handleSeekMouseMove);
    document.addEventListener('mouseup', this.handleSeekMouseUp);
  }

  bindVolumeMouseEvents() {
    document.addEventListener('mousemove', this.handleVolumeMouseMove);
    document.addEventListener('mouseup', this.handleVolumeMouseUp);
  }

  changeSong(changeType) {
    const { dispatch } = this.props;
    dispatch(changeSong(changeType));
  }

  changeVolume(e) {
    const audioElement = this.audio;
    audioElement.volume = (e.clientX - offsetLeft(e.currentTarget)) / e.currentTarget.offsetWidth;
  }

  handleEnded() {
    if (this.state.repeat) {
      this.audio.play();
    } else if (this.state.shuffle) {
      this.changeSong(CHANGE_TYPES.SHUFFLE);
    } else {
      this.changeSong(CHANGE_TYPES.NEXT);
    }
  }

  handleLoadedMetadata() {
    const audioElement = this.audio;
    this.setState({
      duration: Math.floor(audioElement.duration),
    });
  }

  handleLoadStart() {
    const { dispatch } = this.props;
    dispatch(changeCurrentTime(0));
    this.setState({
      duration: 0,
    });
  }

  handleMouseClick(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  handlePause() {
    const { dispatch } = this.props;
    dispatch(toggleIsPlaying(false));
  }

  handlePlay() {
    const { dispatch } = this.props;
    dispatch(toggleIsPlaying(true));
  }

  handleSeekMouseDown() {
    this.bindSeekMouseEvents();
    this.setState({
      isSeeking: true,
    });
  }

  handleSeekMouseMove(e) {
    const { dispatch } = this.props;
    const seekBar = this.seekBar;
    const diff = e.clientX - offsetLeft(seekBar);
    const pos = diff < 0 ? 0 : diff;
    let percent = pos / seekBar.offsetWidth;
    percent = percent > 1 ? 1 : percent;

    dispatch(changeCurrentTime(Math.floor(percent * this.state.duration)));
  }

  handleSeekMouseUp() {
    if (!this.state.isSeeking) {
      return;
    }

    document.removeEventListener('mousemove', this.handleSeekMouseMove);
    document.removeEventListener('mouseup', this.handleSeekMouseUp);
    const { currentTime } = this.props.player;

    this.setState({
      isSeeking: false,
    }, () => {
      this.audio.currentTime = currentTime;
    });
  }

  handleTimeUpdate(e) {
    if (this.state.isSeeking) {
      return;
    }

    const { dispatch, player } = this.props;
    const audioElement = e.currentTarget;
    const currentTime = Math.floor(audioElement.currentTime);

    if (currentTime === player.currentTime) {
      return;
    }

    dispatch(changeCurrentTime(currentTime));
  }

  handleVolumeChange(e) {
    if (this.state.isSeeking) {
      return;
    }

    const volume = e.currentTarget.volume;
    LocalStorageUtils.set('volume', volume);
    this.setState({
      volume,
    });
  }

  handleVolumeMouseDown() {
    this.bindVolumeMouseEvents();
    this.setState({
      isSeeking: true,
    });
  }

  handleVolumeMouseMove(e) {
    const volumeBar = this.volumeBar;
    const diff = e.clientX - offsetLeft(volumeBar);
    const pos = diff < 0 ? 0 : diff;
    let percent = pos / volumeBar.offsetWidth;
    percent = percent > 1 ? 1 : percent;

    this.setState({
      volume: percent,
    });
    this.audio.volume = percent;
  }

  handleVolumeMouseUp() {
    if (!this.state.isSeeking) {
      return;
    }

    document.removeEventListener('mousemove', this.handleVolumeMouseMove);
    document.removeEventListener('mouseup', this.handleVolumeMouseUp);

    this.setState({
      isSeeking: false,
    });
    LocalStorageUtils.set('volume', this.state.volume);
  }

  handleKeyDown(e) {
    const keyCode = e.keyCode || e.which;
    const isInsideInput = e.target.tagName.toLowerCase().match(/input|textarea/);
    if (isInsideInput) {
      return;
    }

    if (keyCode === 32) {
      e.preventDefault();
      this.togglePlay();
    } else if (keyCode === 37 || keyCode === 74) {
      e.preventDefault();
      this.changeSong(CHANGE_TYPES.PREV);
    } else if (keyCode === 39 || keyCode === 75) {
      e.preventDefault();
      this.changeSong(CHANGE_TYPES.NEXT);
    }
  }

  seek(e) {
    const { dispatch } = this.props;
    const audioElement = this.audio;
    const percent = (e.clientX - offsetLeft(e.currentTarget)) / e.currentTarget.offsetWidth;
    const currentTime = Math.floor(percent * this.state.duration);

    dispatch(changeCurrentTime(currentTime));
    audioElement.currentTime = currentTime;
  }

  toggleMute() {
    const audioElement = this.audio;
    audioElement.muted = !this.state.muted;

    this.setState({ muted: !this.state.muted });
  }

  togglePlay() {
    const { isPlaying } = this.props.player;
    const audioElement = this.audio;
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
  }

  toggleRepeat() {
    this.setState({ repeat: !this.state.repeat });
  }

  toggleShuffle() {
    this.setState({ shuffle: !this.state.shuffle });
  }

  renderDurationBar() {
    const { currentTime } = this.props.player;
    const { duration } = this.state;

    if (duration !== 0) {
      const width = currentTime / duration * 100;
      return (
        <div
          className="player-seek-duration-bar"
          style={{ width: `${width}%` }}
        >
          <div
            className="player-seek-handle"
            onClick={this.handleMouseClick}
            onMouseDown={this.handleSeekMouseDown}
          />
        </div>
      );
    }

    return null;
  }

  renderPlaylist() {
    const { dispatch, player, playlists, songs } = this.props;
    return (
      <Playlist
        dispatch={dispatch}
        player={player}
        playlists={playlists}
        songs={songs}
      />
    );
  }

  renderVolumeBar() {
    const { muted, volume } = this.state;
    const width = muted ? 0 : volume * 100;
    return (
      <div
        className="player-seek-duration-bar"
        style={{ width: `${width}%` }}
      >
        <div
          className="player-seek-handle"
          onClick={this.handleMouseClick}
          onMouseDown={this.handleVolumeMouseDown}
        />
      </div>
    );
  }

  renderVolumeIcon() {
    const { muted, volume } = this.state;

    if (muted) {
      return <i className="icon ion-android-volume-off" />;
    }

    if (volume === 0) {
      return <i className="icon ion-android-volume-mute" />;
    } else if (volume === 1) {
      return (
        <div className="player-volume-button-wrap">
          <i className="icon ion-android-volume-up" />
          <i className="icon ion-android-volume-mute" />
        </div>
      );
    }

    return (
      <div className="player-volume-button-wrap">
        <i className="icon ion-android-volume-down" />
        <i className="icon ion-android-volume-mute" />
      </div>
    );
  }

  render() {
    const { dispatch, player, playingSongId, songs, users } = this.props;
    const { isPlaying } = player;
    const song = songs[playingSongId];
    const user = users[song.user_id];
    const { currentTime } = player;
    const { duration } = this.state;
    const prevFunc = this.changeSong.bind(this, CHANGE_TYPES.PREV);
    const nextFunc = this.changeSong.bind(
      this,
      this.state.shuffle ? CHANGE_TYPES.SHUFFLE : CHANGE_TYPES.NEXT
    );

    return (
      <div className="player">
        <audio
          id="audio"
          ref={(node) => { this.audio = node; }}
          src={formatStreamUrl(song.stream_url)}
          onVolumeChange={this.handleVolumeChange}
          onTimeUpdate={this.handleTimeUpdate}
          onPlay={this.handlePlay}
          onPause={this.handlePause}
          onEnded={this.handleEnded}
          onLoadStart={this.handleLoadStart}
          onLoadedMetadata={this.handleLoadedMetadata}
        />
        <div className="container">
          <div className="player-main">
            <div className="player-section player-info">
              <img
                alt="song artwork"
                className="player-image"
                src={getImageUrl(song.artwork_url)}
              />
              <SongDetails
                dispatch={dispatch}
                songId={song.id}
                title={song.title}
                userId={user.id}
                username={user.username}
              />
            </div>
            <div className="player-section">
              <div
                className="player-button"
                onClick={prevFunc}
              >
                <i className="icon ion-ios-rewind" />
              </div>
              <div
                className="player-button"
                onClick={this.togglePlay}
              >
                <i className={`icon ${(isPlaying ? 'ion-ios-pause' : 'ion-ios-play')}`} />
              </div>
              <div
                className="player-button"
                onClick={nextFunc}
              >
                <i className="icon ion-ios-fastforward" />
              </div>
            </div>
            <div className="player-section player-seek">
              <div className="player-seek-bar-wrap" onClick={this.seek}>
                <div className="player-seek-bar" ref={(node) => { this.seekBar = node; }}>
                  {this.renderDurationBar()}
                </div>
              </div>
              <div className="player-time">
                <span>{formatSeconds(currentTime)}</span>
                <span className="player-time-divider">/</span>
                <span>{formatSeconds(duration)}</span>
              </div>
            </div>
            <div className="player-section">
              <div
                className={`player-button ${(this.state.repeat ? ' active' : '')}`}
                onClick={this.toggleRepeat}
              >
                <i className="icon ion-loop" />
                <span className="player-button-tooltip">Repeat</span>
              </div>
              <div
                className={`player-button ${(this.state.shuffle ? ' active' : '')}`}
                onClick={this.toggleShuffle}
              >
                <i className="icon ion-shuffle" />
                <span className="player-button-tooltip">Shuffle</span>
              </div>
              <Popover className="player-button top-right">
                <i className="icon ion-android-list" />
                {this.renderPlaylist()}
              </Popover>
              <div
                className="player-button player-volume-button"
                onClick={this.toggleMute}
              >
                {this.renderVolumeIcon()}
              </div>
              <div className="player-volume">
                <div className="player-seek-bar-wrap" onClick={this.changeVolume}>
                  <div className="player-seek-bar" ref={(node) => { this.volumeBar = node; }}>
                    {this.renderVolumeBar()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

Player.propTypes = propTypes;

export default Player;
